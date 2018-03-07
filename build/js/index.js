var socket = io();
var _userNum = 0;
var _repeatFlag = true;
var _userMessagesArea = '';
var _msgFlag = 'group'; //默认群聊
var _user = ''; //私聊对象
$('form').submit(function() {
    return false;
});

//发送图片
$('#file').bind('change',function(evt){
    var files = evt.target.files,
    filesLen = files.length;
    if(filesLen>1){
        alert('只能最多上传一张图片');
        evt.preventDefault();
    }
    var files_name = '';
    for(var i = 0, f; f = files[i]; i++){
        if(!f.type.match('image.*')) alert('请上传图片');
        var reader = new FileReader();
        reader.onload = (function(theFile){
            return function(e){
                var img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'chat-img';
                if (disconnectFlag) {
                    window.location.reload();
                } else {
                    if (_msgFlag == 'group') {
                        //发布群聊图片
                        socket.emit('group-chat-message', img.outerHTML);

                        //发布自己图片
                        $('#group_messages').append($('<li>').html('我<br>' +img.outerHTML).attr('class', 'tr'));
                    } else {
                        //发布私聊图片
                        socket.emit('pc', {
                            "target": _user,
                            "msg": img.outerHTML
                        });

                        //发布自己图片
                        $('.user-chat-area-' + _user).append('<div class="chat-content tr">我<br>' + img.outerHTML+ '</div>');
                    }
                }
                $('form').submit();

                //清空input file上传内容，防止再次上传失败（上传同样内容时）
                $('#file').val('');
                $('#file').outerHTML = $('#file').outerHTML;
                console.log(img);
            }
        })(f);
        reader.readAsDataURL(f);
    }
})

//发送内容
$('#send').click(function(){
    if ($.trim($('#m').val()) == '') {
        alert('请输入内容');
        return false;
    }
    if (disconnectFlag) {
        window.location.reload();
    } else {
        if (_msgFlag == 'group') {
            //发布群聊信息
            socket.emit('group-chat-message', $('#m').val());

            //发布自己信息
            $('#group_messages').append($('<li>').html('我<br>' + $('#m').val()).attr('class', 'tr'));
        } else {
            //发布私聊信息
            socket.emit('pc', {
                "target": _user,
                "msg": $('#m').val()
            });

            //发布自己信息
            $('.user-chat-area-' + _user).append('<div class="chat-content tr">我<br>' + $('#m').val() + '</div>');
        }
        $('#m').val('');
    }
    $('form').submit();
})

//成功连接服务器
socket.on('connection', function(data) {
    if (data.connection) {
        $('#mask .loading').hide();
        $('#mask .enter-name').show();
    }
    disconnectFlag = false;
})

//输入昵称
var _nickname = $('#nickname');
$('#send-name').click(function() {
    if ($.trim(_nickname.val()) == '') {
        alert('请输入昵称');
    } else {
        socket.emit('login', _nickname.val()); //通知服务器用户进入群聊
        _user = _nickname.val();
    }
})

//检查用户名是否重复
socket.on('repeat', function(repeatFlag) {
    if (repeatFlag) {
        alert('用户名已经存在');
        _repeatFlag = true;
    }
})

//顺利进入群聊
socket.on('loginSuccess', function(loginSuccessFlag) {
    if (loginSuccessFlag) {
        _repeatFlag = false;
        $('#mask').hide();
        $('.room').show();
    }
})

//获取系统信息
socket.on('system', function(data) {
    //最新加入群聊用户信息，用户数量，用户进入或者离开
    if (data.flag) {
        //有新用户进来
        $('.room .wrapper .right .welcome_area').append('\
            <div class="user-in">\
            欢迎\
            用户<strong class="user-in-name" data-id="' + data.nickname + '">' + data.nickname + '</strong>\
            加入群聊！\
            </div>');
    } else {
        //有用户离开
        $('.room .wrapper .right .welcome_area').append('\
            <div class="user-out">\
            用户<strong class="user-out-name" data-id="' + data.nickname + '">' + data.nickname + '</strong>\
            已经离开群聊！\
            </div>');
    }
    $('.room .allusers .num').text(data.size);
})

//群聊
$('.room .allusers').click(function() {
    $('.user-chat-area').hide();
    $('.group-chat-area').show();
    _msgFlag = 'group';
    $('.room .allusers').find('.count').text(0).css('visibility', 'hidden');
})
socket.on('group-chat-message', function(nickname, msg) {
    if (!_repeatFlag) {
        //如果用户名没有重复
        $('#group_messages').append($('<li>').html('来自用户' + nickname + '的信息<br>' + msg));
        var _num = parseInt($('.room .allusers').find('.count').text());
        _num++;
        $('.room .allusers').find('.count').text(_num).css('visibility', 'visible');
    }
});

//私聊
$('.room .wrapper').on('click', '.user-in-name', function() {
    var _this = $(this);
    if (_this.attr('data-id') == _nickname.val()) {
        return false;
    }
    if ($('.userroom .user_' + _this.attr('data-id')).length == 0) {
        _msgFlag = 'user';
        $('.userroom').append('<div data-id=' + _this.attr('data-id') + ' class="users user_' + _this.attr('data-id') + '">' + _this.attr('data-id') + '<span class="count">0</span>（私聊模式）</div>');
    }
    if ($('.user-chat-area .user-chat-area-' + _this.attr('data-id')).length == 0) {
        $('.user-chat-area').append('<div class="user_messages user-chat-area-' + _this.attr('data-id') + '"><p>与用户' + _this.attr('data-id') + '私聊中</p></div>');
    }
    $('.group-chat-area').hide();
    $('.user-chat-area').show();
    $('.user_messages').hide();
    $('.user-chat-area-' + _this.attr('data-id')).show();
    _user = _this.attr('data-id');
})
$('.userroom').on('click', '.users', function() {
        var _this = $(this);
        $('.group-chat-area').hide();
        $('.user-chat-area').show();
        $('.user_messages').hide();
        $('.user-chat-area-' + _this.attr('data-id')).show();
        _msgFlag = 'user';
        _userMessagesArea = $('#user_messages_' + _this.attr('data-id'));
        _userMessagesArea.show();
        _user = _this.attr('data-id');
        $('.userroom .user_' + _this.attr('data-id')).find('.count').text(0).css('visibility', 'hidden'); //读取信息后，最新消息数量清零
    })
    //接受私聊信息
socket.on('pcmsg', function(data) {
    console.log(data);
    //添加左边信息提示
    if ($('.userroom .user_' + data.source).length == 0) {
        $('.userroom').append($('<div>').html(data.source + '<span class="count">0</span>（私聊模式）').attr('data-id', data.source).attr('class', 'users user_' + data.source));
    }
    //添加右边信息内容
    if ($('.user-chat-area-' + data.source).length == 0) {
        $('.user-chat-area').append('<div class="user_messages user-chat-area-' + data.source + '"><p class="tips">与用户' + data.source + '私聊中</p></div>');
    }

    $('.user-chat-area-' + data.source).append('<div class="chat-content tl">来自用户' + data.source + '的信息<br>' + data.msg + '</div>');
    var _num = parseInt($('.userroom .user_' + data.source).find('.count').text());
    _num++;
    $('.userroom .user_' + data.source).find('.count').text(_num).css('visibility', 'visible'); //获取最新消息数量，并显示出来
});

//由于长时间未说话，您已经掉线
socket.on('nouser', function(nouser) {
    console.log(nouser);
    $('.welcome_area').append('<div class="user-out">由于长时间未说话，您已经掉线，请重新刷新页面</div>');
})

//用户掉线
socket.on('disconnect', function() {
    console.log('用户掉线，发布不了消息');
    disconnectFlag = true;
})
