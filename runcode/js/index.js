var userAgent = navigator.userAgent.toLowerCase();
var is_webtv = userAgent.indexOf('webtv') != -1;
var is_kon = userAgent.indexOf('konqueror') != -1;
var is_mac = userAgent.indexOf('mac') != -1;
var is_saf = userAgent.indexOf('applewebkit') != -1 || navigator.vendor == 'Apple Computer, Inc.';
var is_opera = userAgent.indexOf('opera') != -1 && opera.version();
var is_moz = (navigator.product == 'Gecko' && !is_saf) && userAgent.substr(userAgent.indexOf('firefox') + 8, 3);
var is_ns = userAgent.indexOf('compatible') == -1 && userAgent.indexOf('mozilla') != -1 && !is_opera && !is_webtv && !is_saf;
var is_ie = (userAgent.indexOf('msie') != -1 && !is_opera && !is_saf && !is_webtv) && userAgent.substr(userAgent.indexOf('msie') + 5, 3);

function $(id) {
    return document.getElementById(id);
}

function copyCode(obj) {
    const textareaEle = document.createElement("textarea");
    textareaEle.value = obj.value;
    document.body.appendChild(textareaEle);
    textareaEle.select();
    document.execCommand('copy')
    document.body.removeChild(textareaEle);
}

function runCode(obj) {
    var winname = window.open('', "_blank", '');
    winname.document.open('text/html', 'replace');
    winname.document.write(obj.value);
    winname.document.close();
}

function saveCode(obj) {
    var winname = window.open('', '_blank', 'top=10000');
    winname.document.open('text/html', 'replace');
    winname.document.writeln(obj.value);
    winname.document.execCommand('saveas', '', 'code.htm');
    winname.close();
}