// require in libs
let FormData = require('form-data'),
	mustache = require('mustache'),
	request = require('request'),
	http = require('http'),
	https = require('https'),
	// CSV = require('csv-string'),
	// csvWriterCreator = require('csv-writer'),
	fs = require('fs');

let filename = "writeUsageOnSite.csv";

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

			// Write CSV file - old-fashioned way

			fs.writeFile(filename, msg.payload, function(err) {
				if (err) {
					return console.log(err);
				}
				console.log("The file was saved!");
			});

			// Write CSV file - csvWriter
			// let csvWriter = csvWriterCreator({
			// 	path: './usage.csv',
			// 	header: [
			// 		{id: 'ACCOUNT_ID', title: 'ACCOUNT_ID' },
			// 		{id: 'UOM', title: 'UOM'},
			// 		{id: 'QTY', title: 'QTY'},
			// 		{id: 'STARTDATE', title: 'STARTDATE'},
			// 		{id: 'ENDDATE', title: 'ENDDATE'},
			// 		{id: 'SUBSCRIPTION_ID', title: 'SUBSCRIPTION_ID'},
			// 		{id: 'CHARGE_ID', title: 'CHARGE_ID'},
			// 		{id: 'DESCRIPTION', title: 'DESCRIPTION'}
			// 	]
			// });
			// csvWriter.writeRecords(msg.payload).then(() => {
			// 	console.log('wrote the records!');
			// });

			var opts = {
				method: 'POST',
				url: url,
				timeout: node.reqTimeout,
				// followRedirect: nodeFollowRedirects,
				headers: {},
				encoding: null
			};

			// Normalize headers / Copy over existing headers
			// TODO: refactor/ simplify
			if (msg.headers) {
				for (var v in msg.headers) {
					if (msg.headers.hasOwnProperty(v)) {
						opts.headers[v] = msg.headers[v];
					}
				}
			}

			// 2) Create form data

			var formData = new FormData();

			// TODO: Expand to include all types of form data, not just files

			// formData.append("files", JSON.stringify(msg.payload));
			// formData.append("files", fs.createReadStream("borkbork.csv"));
			// formData.append('file', fs.createReadStream("borkbork.csv"), {
			// 	filename: 'borkbork.csv',
			// 	contentType: 'multipart/form-data'
			// });


			formDataHeaders = formData.getHeaders();

			// insert formDataHeaders into request headers
			for (var i in formDataHeaders) {
				if (formDataHeaders.hasOwnProperty(i)) {
					opts.headers[i] = formDataHeaders[i];
				}
			}

			console.log('Request headers: ' + JSON.stringify(opts.headers)); // TODO: remove later
			console.log('Request url: ' + opts.url);

			// Add auth if it exists
			if (this.credentials && this.credentials.user) {
				console.log("Detected authentication; adding it now");
				var urlTail = url.substring(url.indexOf('://') + 3); // hacky but it works. don't judge me
				var username = this.credentials.user,
					password = this.credentials.password;
				url = 'https://' + username + ':' + password + '@' + urlTail; // TODO make dynamic

			}

			// FormData.submit() Method

			// ===================================================================================================

			// formData.submit(url, function(err, res) {
			// 	console.log('We are submitting the form data...');
			//
			// 	if (err) {
			// 		console.log("Error!" + err.toString());
			// 	} else {
			// 		console.log('Sent form data');
			// 		if (res.statusCode > 299) {
			// 			// console.log('Response object keys: ' + Object.keys(res));
			// 			console.log('res.status: ' + res.statusCode);
			// 			console.log('There was a problem submitting the data: ' + JSON.stringify(res.statusMessage));
			// 		} else {
			// 			console.log('Successfully sent data!');
			// 		}
			//
			// 	}
			//
			// 	responseMsg.statusCode = res.status;
			// 	responseMsg.payload = res.body;
			// 	node.send(responseMsg);
			// });

			// ===================================================================================================

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
				node.send(msg);
			});
			var form = thisReq.form();
			// TODO: make dynamic
			form.append('file', fs.createReadStream("writeUsageOnSite.csv"), { // TODO: change to be csv FILE
				filename: "writeUsageOnSite.csv", // NOTE: chagne later
				contentType: 'multipart/form-data'
			});

			// console.log('form: ' + JSON.stringify(form, null, 2));


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
