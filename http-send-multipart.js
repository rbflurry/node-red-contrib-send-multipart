// require in libs
let FormData = require('form-data'),
	mustache = require('mustache'),
	request = require('request'),
	http = require('http'),
	https = require('https'),
	fs = require('fs');

var filepath = "sanityCheck.csv"; // initializing filepath

module.exports = function(RED) {

	function httpSendMultipart(n) {
		// Setup node
		RED.nodes.createNode(this, n);
		var node = this;
		var nodeUrl = n.url;

		var nodeFollowRedirects = n["follow-redirects"];
		var isTemplatedUrl = (nodeUrl || "").indexOf("{{") != -1;

		this.ret = n.ret || "txt"; // default return type is text
		if (RED.settings.httpRequestTimeout) {
			this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 60000;
		} else {
			this.reqTimeout = 60000;
		}

		// 1) Process inputs to Node
		this.on("input", function(msg) {

			// Look for filepath

			if (n.filepath) {
					filepath = n.filepath;
			} else if (msg.filepath) {
					filepath = msg.filepath;
			} else {
				console.log('No filepath detected');
			}

			var preRequestTimestamp = process.hrtime();
			node.status({
				fill: "blue",
				shape: "dot",
				text: "httpSendMultipart.status.requesting"
			});
			var url = nodeUrl; // TODO add ability to take this from the settings.js config file
			if (isTemplatedUrl) {
				url = mustache.render(nodeUrl, msg);
			}
			if (!url) {
				node.error(RED._("httpSendMultipart.errors.no-url"), msg);
				node.status({
					fill: "red",
					shape: "ring",
					text: (RED._("httpSendMultipart.errors.no-url"))
				});
				return;
			}


			// Add auth if it exists
			if (this.credentials && this.credentials.user) {
				var urlTail = url.substring(url.indexOf('://') + 3); // hacky but it works. don't judge me
				var username = this.credentials.user,
					password = this.credentials.password;
				url = 'https://' + username + ':' + password + '@' + urlTail;

			}

			var respBody, respStatus;

			var thisReq = request.post(url, function(err, resp, body) {
				node.status({});
				if (err) {
					console.log('Error:' + err.toString());
				} else {
					console.log('response body: ' + body);
				}
				msg.payload = body;
				msg.statusCode = resp.statusCode || resp.status;
				console.log('Sending response message: ' + JSON.stringify(msg));

				if (node.ret !== "bin") {
					msg.payload = body.toString('utf8'); // txt

					if (node.ret === "obj") {
						try {
							msg.payload = JSON.parse(body);
						}
						catch (e) {
							node.warn(RED._("httpSendMultipart.errors.json-error"));
						}
					}
				}

				node.send(msg);
			});
			var form = thisReq.form();
			form.append('file', fs.createReadStream(filepath), {
				filename: filepath,
				contentType: 'multipart/form-data'
			});

		}); // end of on.input

	} // end of httpSendMultipart fxn

	// Register the Node
	RED.nodes.registerType("http-send-multipart", httpSendMultipart, {
		credentials: {
			user: {
				type: "text"
			},
			password: {
				type: "password"
			}
		}
	});

};
