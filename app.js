//app.js

var express = require("express"),
app = express(),
http = require('http').Server(app),
io = require('socket.io')(http),
path = require('path'),
users = {},
MAX_LEAVE_TIME = 300,
PONG_TIME = 3000,
port = process.env.port || 2018;

//指定资源文件根目录
app.use(express.static(path.join(__dirname, "build/")));

// 指定webscoket的客户端的html文件
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.emit('connection',{ connection: true})

    // 用户登录
	socket.on("login", (nickname) => {
		if (users[nickname] || nickname === "system") {
			console.log('user repeat');
			socket.emit("repeat",true);
		} else {
			socket.nickname = nickname;
			users[nickname] = {
				name: nickname,
				socket: socket,
				lastSpeakTime: nowSecond()
			};
			socket.emit("loginSuccess",true);
			UsersChange(nickname, true);
		}
	});

    //用户退出
    socket.on('disconnect', function() {
        console.log('user disconnected');
        if (socket.nickname && users[socket.nickname]) {
			delete users[socket.nickname];
			UsersChange(socket.nickname, false);
		}
    });

	//群聊信息
    socket.on('group-chat-message', function(msg) {
        console.log('message: ' + msg);
        if(socket&&socket.nickname && users[socket.nickname]){
			users[socket.nickname].lastSpeakTime = nowSecond();
	    	socket.broadcast.emit('group-chat-message', socket.nickname,msg);
        }
    });

    // 私聊
	socket.on("pc", (data) => {
		var target = data.target;
		console.log("socket:"+socket);
		console.log("socket.nickname:"+socket.nickname);
        if(socket&&socket.nickname && users[socket.nickname]){
			users[socket.nickname].lastSpeakTime = nowSecond();
			if (users[target]) {
				users[target].socket.emit("pcmsg", {
					target: target,
					source: socket.nickname,
					msg: data.msg
				});
			} else {
				const msg = target === "system" ? "傲娇的system管理员不陪聊~" : "该用户已经下线";
				socket.emit("nouser", msg);
			}
        }
	});
	
	// 心跳检测
	socket.on("pong", (id) => {
		socket.emit("ping");
	});
});

function pong () {
	const now = nowSecond();
	for (let k in users) {
		if (users[k].lastSpeakTime + MAX_LEAVE_TIME < now) {
			var socket = users[k].socket;
			users[k].socket.emit("disconnect");
			socket.emit("nouser", "由于长时间未说话，您已经掉线，请重新刷新页面");
			socket = null;
		}
	}
}
// 心跳检测
setInterval(pong, PONG_TIME);
function UsersChange (nickname, flag) {
	io.sockets.emit("system", {
		nickname: nickname,
		size: Object.keys(users).length,
		flag: flag
	});
}
function nowSecond () {
	return Math.floor(new Date() / 1000);
}

//emit(eventName,参数1,参数2) //传给服务端eventName事件回调函数的参数

app.set('port', process.env.PORT || 3000);

var server = http.listen(app.get('port'), function() {
    console.log('start at port:' + server.address().port);
});
