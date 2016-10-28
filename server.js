var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('link.db');
users = {};
connections = [];

server.listen(process.env.PORT || 8080);
console.log('Server running..');

app.set('views', 'views');
app.set('view engine', 'hbs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static('public'));

app.get('/', function(req, res){
    res.render('index.hbs');
});

io.sockets.on('connection', function(socket){
	updateUsernames();

	// Disconnect
	socket.on('disconnect', function(data){
		if(!socket.username) return;
		delete users[socket.username];
		updateUsernames();
		var date = new Date();
       	var horodatage = addZero(date.getHours()) + 'h' + addZero(date.getMinutes());
		connections.splice(connections.indexOf(socket), 1);
		console.log('Déconnexion de '+socket.username+': %s personne(s) connectée(s)', connections.length);
		io.sockets.emit('system', {msg: "a quitté le tchat.", user: socket.username, horodatage: horodatage});
	});
	
	// Send Message
	socket.on('send message', function(data, horodatage, callback){
		var msg = data.trim();
		if(msg.substring(0, 3) === '/w '){
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users){
					users[name].emit('whisper', {msg: msg, user: socket.username, horodatage: horodatage});
					users[socket.username].emit('whisperExpediteur', {msg: msg, user: name, horodatage: horodatage});
					console.log('Chuchotement de '+socket.username+' à '+name+'. Message: '+msg);
				} else{
					callback("<b>Erreur</b>: Entrez un utilisateur valide.");
				}
			} else{
				callback("<b>Erreur</b>: Entrez un message valide s'il vous plaît.")
			}
		} else{
			io.sockets.emit('new message', {msg: msg, user: socket.username, horodatage: horodatage});
			console.log('Message de '+socket.username+': '+msg);
		}
	});

	// New user
	socket.on('new user', function(data, callback){
		if(data in users){
			callback(false);
		}
		else{
	        var date = new Date();
       		var horodatage = addZero(date.getHours()) + 'h' + addZero(date.getMinutes());
			connections.push(socket);
			console.log('Connexion de '+data+': %s personne(s) connectée(s)', connections.length);
			callback(true);
			socket.username = data;
			users[socket.username] = socket;
			updateUsernames();
			io.sockets.emit('system', {msg: "a rejoint le tchat.", user: socket.username, horodatage: horodatage});
		}
	});

	function updateUsernames(){
		io.sockets.emit('get users', Object.keys(users));
	}


    function addZero(i) {
    	if (i < 10) {
            i = "0" + i;
        }   
        return i;
    }
});