// require in libs
let FormData = require('form-data'),
	mustache = require('mustache'),
	request = require('request'),
	http = require('http'),
	https = require('https'),
	fs = require('fs');

let filename = "thisisreal.csv";

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

			console.log('Received msg.payload: ' + JSON.stringify(msg.payload));

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

			// Write CSV file - old-fashioned way
			// fs.writeFile(filename, msg.payload,'utf8', function(err) {
			//
			// 	console.log('Writing this csv string to a file: ' + msg.payload);
			//
			// 	if (err) {
			// 		return console.log(err);
			// 	}
			// 	console.log("Filename " + filename + " was written to the local instance.");
			// });


			// Write CSV file - csvWriter
			// Send msg.payload straight to httpSendMultipart
			// var writer = csvWriter();
			// writer.pipe(fs.createWriteStream(csvFileName));
			// writer.write(msg.payload);
			// writer.end();


			// Add auth if it exists
			if (this.credentials && this.credentials.user) {
				var urlTail = url.substring(url.indexOf('://') + 3); // hacky but it works. don't judge me
				var username = this.credentials.user,
					password = this.credentials.password;
				url = 'https://' + username + ':' + password + '@' + urlTail;

			}

			var respBody, respStatus;
			var thisReq = request.post(url, function(err, resp, body) {
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
			form.append('file', fs.createReadStream(filename), {
				filename: filename,
				contentType: 'multipart/form-data'
			});


			//  Taken from Postman
			// =================================================================================
			// var csvFile = CSV.parse(msg.payload);
			// var options = {
			// 	method: 'POST',
			// 	url: 'https://rest.apisandbox.zuora.com/v1/usage',
			// 	headers: {
			// 		'postman-token': '253d8e07-3081-2484-3ab8-b9acee884a0c',
			// 		'cache-control': 'no-cache',
			// 		apisecretaccesskey: 'uiotS8D2018!',
			// 		apiaccesskeyid: 'greg.kwiatkowski+testDrive@sbdinc.com',
			// 		'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
			// 	},
			// 	formData: {
			// 		file: {
			// 			value: fs.createReadStream(csvFile),
			// 			options: {
			// 				filename: 'borkbork.csv',
			// 				contentType: 'multipart/form-data'
			// 			}
			// 		}
			// 	}
			// };

			// request(options, function(err, res, body) {
			// 	if (err) {
			// 		console.log(err);
			// 	} else {
			// 		console.log("Response body: " + body);
			// 	}
			// });
			// ============================================================================


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
