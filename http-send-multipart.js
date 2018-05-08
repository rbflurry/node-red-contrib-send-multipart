// require in libs
let cors = require('cors');
let FormData = require('form-data'),
	mustache = require('mustache'),
	http = require('http'),
	https = require('https'), // NOTE: consider using request.js instead?
	fs = require('fs');

module.exports = function(RED) {

	function httpSendMultipart(n) {
		// Setup node
		RED.nodes.createNode(this, n);
		var node = this;
		var nodeUrl = n.url;
		var nodeFollowRedirects = n["follow-redirects"];
		var isTemplatedUrl = (nodeUrl || "").indexOf("{{") != -1;

		this.ret = n.ret || "txt";
		if (RED.settings.httpRequestTimeout) {
			this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 120000;
		} else {
			this.reqTimeout = 120000;
		}

		// 1) Process inputs to Node
		this.on("input", function(msg) {
			var preRequestTimestamp = process.hrtime();
			node.status({
				fill: "blue",
				shape: "dot",
				text: "httpSendMultipart.status.requesting"
			});
			var url = nodeUrl || msg.url; // TODO add ability to take this from the settings.js config file
			if (isTemplatedUrl) {
				url = mustache.render(nodeUrl, msg);
			}
			if (!url) {
				node.error(RED._("httpin.errors.no-url"), msg);
				node.status({
					fill: "red",
					shape: "ring",
					text: (RED._("httpin.errors.no-url"))
				});
				return;
			}

			var opts = {
				method: 'POST',
				url: url,
				timeout: node.reqTimeout,
				// followRedirect: nodeFollowRedirects,
				headers: {},
				encoding: null
			};

			// Normalize headers / Copy over existing headers
			if (msg.headers) {
				for (var v in msg.headers) {
					if (msg.headers.hasOwnProperty(v)) {
						// var name = v.toLowerCase();
						// if (name !== "content-type" && name !== "content-length") {
						// 	// only normalise the known headers used later in this
						// 	// function. Otherwise leave them alone.
						// 	name = v;
						// }
						// opts.headers[name] = msg.headers[v];
						opts.headers[v] = msg.headers[v];
					}
				}
			}

			// 2) Create form data

			var formData = new FormData();

			// TODO: Expand to include all types of form data, not just files

			// formData.append("files", msg.payload);
			formData.append("file", fs.createReadStream(msg.payload));

			formDataHeaders = formData.getHeaders();

			// insert formDataHeaders into request headers
			for (var i in formDataHeaders) {
				if (formDataHeaders.hasOwnProperty(i)) {
					opts.headers[i] = formDataHeaders[i];
				}
			}

			console.log('Request headers: ' + JSON.stringify(opts.headers)); // TODO: remove later
			console.log('Request url: ' + opts.url);

			// 2) Format POST request

			// Add auth if it exists
			if (this.credentials && this.credentials.user) {
				opts.auth = {
					user: this.credentials.user,
					pass: this.credentials.password,
					sendImmediately: false
				};
			}

			var request;
			if (url.indexOf('https://') > -1) {
				request = https.request(opts);
			} else {
				request = http.request(opts);
			}

			// 3) Send POST request to endpoint

			formData.pipe(request);

			// TODO: handle output

			// Potential solution
			// fs.stat("image.jpg", function(err, stats) {
			// 	restler.post("http://posttestserver.com/post.php", {
			// 		multipart: true,
			// 		data: {
			// 			"folder_id": "0",
			// 			"filename": restler.file("image.jpg", null, stats.size, null, "image/jpg")
			// 		}
			// 	}).on("complete", function(data) {
			// 		console.log(data);
			// 	});
			// });

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
