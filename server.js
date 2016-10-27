var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
users = {};
connections = [];

server.listen(process.env.PORT || 8080);
console.log('Server running..');

app.use(express.static('public'));

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html')
});

io.sockets.on('connection', function(socket){
	updateUsernames();

	// Disconnect
	socket.on('disconnect', function(data){
		if(!socket.username) return;
		delete users[socket.username];
		updateUsernames();
		connections.splice(connections.indexOf(socket), 1);
		console.log('Déconnexion de '+socket.username+': %s personne(s) connectée(s)', connections.length);
		io.sockets.emit('system', {msg: "a quitté le tchat.", user: socket.username});
	});
	
	// Send Message
	socket.on('send message', function(data, callback){
		var msg = data.trim();
		if(msg.substring(0, 3) === '/w '){
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users){
					users[name].emit('whisper', {msg: msg, user: socket.username});
					users[socket.username].emit('whisperExpediteur', {msg: msg, user: name});
					console.log('Chuchotement de '+socket.username+' à '+name+'. Message: '+msg);
				} else{
					callback("<b>Erreur</b>: Entrez un utilisateur valide.");
				}
			} else{
				callback("<b>Erreur</b>: Entrez un message valide s'il vous plaît.")
			}
		} else{
			io.sockets.emit('new message', {msg: msg, user: socket.username});
			console.log('Message de '+socket.username+': '+msg);
		}
	});

	// New user
	socket.on('new user', function(data, callback){
		if(data in users){
			callback(false);
		}
		else{
			connections.push(socket);
			console.log('Connexion de '+data+': %s personne(s) connectée(s)', connections.length);
			callback(true);
			socket.username = data;
			users[socket.username] = socket;
			updateUsernames();
			io.sockets.emit('system', {msg: "a rejoint le tchat.", user: socket.username});
		}
	});

	function updateUsernames(){
		io.sockets.emit('get users', Object.keys(users));
	}
});