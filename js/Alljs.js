// 1.禁用右键菜单
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();  // 阻止默认事件
});
// 2.禁止鼠标选中
document.addEventListener('selectstart', function (e) {
    e.preventDefault();
});
// 3.禁止键盘F12键
document.addEventListener('keydown', function (e) {
    if (e.key == 'F12') {
        e.preventDefault(); // 如果按下键F12,阻止事件
    }
});

window.addEventListener('load', function () {
    // 页面所有元素加载完成后执行以下代码
    var loader = document.querySelector('.loading');
    // 隐藏 loading 元素
    loader.style.display = 'none';

    var LAppDefine = {

        //这里配置canvsa元素的id
        CANVAS_ID: "waifu",

        //是否允许拖拽，默认为true
        IS_DRAGABLE: true
    };

    this.canvas = document.getElementById(LAppDefine.CANVAS_ID);
    if (this.canvas.addEventListener) {
        this.canvas.addEventListener("click", mouseEvent, false);
        this.canvas.addEventListener("mousedown", mouseEvent, false);
        this.canvas.addEventListener("mouseup", mouseEvent, false);
        this.canvas.addEventListener("mousemove", mouseEvent, false);
    }

    var isDragging = false;
    var mouseOffsetx = 0;
    var mouseOffsety = 0;
    function mouseEvent(e) {
        e.preventDefault();
        if (e.type == "mousedown") {
            if ("button" in e && e.button != 0) {
                return;
            }
            isDragging = true;
            mouseOffsetx = e.pageX - document.getElementById(LAppDefine.CANVAS_ID).offsetLeft;
            mouseOffsety = e.pageY - document.getElementById(LAppDefine.CANVAS_ID).offsetTop;
        } else if (e.type == "mousemove") {
            if (isDragging == true) {
                var movex = e.pageX - mouseOffsetx;
                var movey = e.pageY - mouseOffsety;
                if (movex > window.innerWidth - document.getElementById(LAppDefine.CANVAS_ID).width)
                    movex = window.innerWidth - document.getElementById(LAppDefine.CANVAS_ID).width;
                if (movex < 0) movex = 0;
                if (movey > window.innerHeight - document.getElementById(LAppDefine.CANVAS_ID).height)
                    movey = window.innerHeight - document.getElementById(LAppDefine.CANVAS_ID).height;
                if (movey < 0) movey = 0;
                if (LAppDefine.IS_DRAGABLE) {
                    document.getElementById(LAppDefine.CANVAS_ID).style.left = movex + "px";
                    document.getElementById(LAppDefine.CANVAS_ID).style.top = movey + "px";
                }
            }
        } else if (e.type == "mouseup") {
            if ("button" in e && e.button != 0) return;
            isDragging = false;
        }
    }
});