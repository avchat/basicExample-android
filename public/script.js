var serverUrl = "/";
var localStream, room, recording;

function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex
			.exec(location.search);
	return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g,
			" "));
}

window.onload = function() {
	recording = false;
	var screen = getParameterByName("screen");

	localStream = Erizo.Stream({
		streamID : 'local_stream_0',
		audio : true,
		video : true,
		data : false,
		screen : screen,
		videoSize : [ 640, 480, 640, 480 ]
	});
	var createToken = function(userName, role, callback) {

		var req = new XMLHttpRequest();
		var url = serverUrl + 'createToken/';
		var body = {
			username : userName,
			role : role
		};

		req.onreadystatechange = function() {
			if (req.readyState === 4) {
				callback(req.responseText);
			}
		};

		req.open('POST', url, true);
		req.setRequestHeader('Content-Type', 'application/json');
		req.send(JSON.stringify(body));
	};

	createToken("user", "presenter", function(response) {
		var token = response;
		console.log(token);
		room = Erizo.Room({
			token : token
		});

		localStream.addEventListener("access-accepted", function() {
			console.log("my access-accepted");
			var subscribeToStreams = function(streams) {
				for ( var index in streams) {
					var stream = streams[index];
					if (localStream.getID() !== stream.getID()) {
						room.subscribe(stream);
					}
				}
			};

			room.addEventListener("room-connected", function(roomEvent) {

				room.publish(localStream, {
					maxVideoBW : 300
				});

				localStream.show("local_view_0");
				
				subscribeToStreams(roomEvent.streams);
			});

			room.addEventListener("stream-subscribed", function(streamEvent) {
				var stream = streamEvent.stream;
				
				var param = {
					width : 320,
					height : 240,
					view_id : "remote_view_" + stream.getID()
				};
				pcManagerJS.call_method('view_new', "0", param);
				stream.show("remote_view_" + stream.getID());

			});

			room.addEventListener("stream-added", function(streamEvent) {
				var streams = [];
				streams.push(streamEvent.stream);
				subscribeToStreams(streams);
			});

			room.addEventListener("stream-removed", function(streamEvent) {
				var stream = streamEvent.stream;
				if (stream.elementID !== undefined) {
					var param = {
						view_id : "remote_view_" + stream.getID()
					};
					pcManagerJS.call_method('view_delete', "0", param);
				}
			});

			console.log("room.connect");
			room.connect();
		});

		var param = {
			width : 320,
			height : 240,
			view_id : "local_view_0"
		};
		pcManagerJS.call_method('view_new', "0", param);

		localStream.init();
	});
};
