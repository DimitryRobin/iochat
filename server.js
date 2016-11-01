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
var typingUsers = [];
var colors = require('colors');  

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

		// Si jamais il était en train de saisir un texte, on l'enlève de la liste
	      var typingUserIndex = typingUsers.indexOf(socket.username);
	      if (typingUserIndex !== -1) {
	        typingUsers.splice(typingUserIndex, 1);
	      }

		delete users[socket.username];
		updateUsernames();
		var date = new Date();
       	var horodatage = addZero(date.getHours()) + 'h' + addZero(date.getMinutes());
		connections.splice(connections.indexOf(socket), 1);
		console.log('[DECONNEXION]'.yellow+' '+socket.username+': %s personne(s) connectée(s)', connections.length);
		io.sockets.emit('system', {msg: "a quitté le tchat.", user: socket.username, horodatage: horodatage});
	});
	
	// Send Message
	socket.on('send message', function(data, horodatage, callback){
		var msg = data.trim();
		if(msg.indexOf('<fghdfhdf') === -1){
			if(msg.substring(0, 3) === '/w '){
				msg = msg.substr(3);
				var ind = msg.indexOf(' ');
				if(ind !== -1){
					var name = msg.substring(0, ind);
					var msg = msg.substring(ind + 1);
					if(name in users){
						if(name != socket.username){
							users[name].emit('whisper', {msg: msg, user: socket.username, horodatage: horodatage});
							users[socket.username].emit('whisperExpediteur', {msg: msg, user: name, horodatage: horodatage});
							console.log('[CHUCHOTEMENT]'.cyan+' De '+socket.username+' à '+name+'. Message: '+msg);
						} else{
							callback("<b>Erreur</b>: Vous ne pouvez pas vous chuchoter vous même.<span class='heure'>"+horodatage+"</span>");
						}
					} else{
						callback("<b>Erreur</b>: Entrez un utilisateur valide.<span class='heure'>"+horodatage+"</span>");
					}
				} else{
					callback("<b>Erreur</b>: Entrez un message valide s'il vous plaît.<span class='heure'>"+horodatage+"</span>")
				}
			} else{
				io.sockets.emit('new message', {msg: msg, user: socket.username, horodatage: horodatage});
				console.log("[VALIDE]".green+" Message de "+socket.username+": "+msg);
			}
		} else{
			callback("<b>Petit malin</b>, ça ne marche pas :p<span class='heure'>"+horodatage+"</span>");
			console.log("[INVALIDE]".red+" Message de "+socket.username+": "+msg);
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
			console.log('[CONNEXION]'.yellow+' '+data+': %s personne(s) connectée(s)', connections.length);
			callback(true);
			socket.username = data;
			users[socket.username] = socket;
			updateUsernames();
			io.sockets.emit('system', {msg: "a rejoint le tchat.", user: socket.username, horodatage: horodatage});
		}
	});

	 /**
	   * Réception de l'événement 'start-typing'
	   * L'utilisateur commence à saisir son message
	   */
    socket.on('start-typing', function(data) {
	    // Ajout du user à la liste des utilisateurs en cours de saisie
	    if (typingUsers.indexOf(socket.username) === -1) {
	        typingUsers.push(socket.username);
	    	//console.log('longueur start : ' + typingUsers.length);
	    }
	    io.sockets.emit('update-typing', typingUsers);
	});

	  /**
	   * Réception de l'événement 'stop-typing'
	   * L'utilisateur a arrêter de saisir son message
	   */
	socket.on('stop-typing', function () {
	    var typingUserIndex = typingUsers.indexOf(socket.username);
	    if (typingUserIndex !== -1) {
	        typingUsers.splice(typingUserIndex, 1);	
			//console.log('longueur stop : ' + typingUsers.length);
	    }
	    io.sockets.emit('update-typing', typingUsers);
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