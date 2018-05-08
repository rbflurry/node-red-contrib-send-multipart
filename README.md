# node-red-contrib-send-multipart
This is a node-red node for posting http(s) requests with multipart formData. Currently a work in progress
Right now this node is only looking for files. However, there are future plans to handle all multipart/form-data.

## Installation
run npm -g install node-red-contrib-send-multipart

<!-- [![npm package](https://nodei.co/npm/node-red-contrib-http-request.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/node-red-contrib-http-request/) -->

## Features
Pulled together using some of the best of parts of other node-red-contrib nodes (particularly node-red-contrib-http-request), and the best parts of stackoverflow.
Currently only accepts & sends files. However, there are future plans to handle all multipart/form-data. 

## Why this module ?
As of May 2018, NodeRed does not yet support sending multipart form-data.  This module serves to fill that gap.

There is always room for improvement, and new ideas are valued.  Feel free to submit pull requests to make this library even better.
