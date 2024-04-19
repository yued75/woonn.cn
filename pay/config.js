const basic = { // 基础设置
    title: '打赏支持(～￣▽￣)～', // 页面标题
    avatar: '../img/ico.jpg', // 头像 URL
    name: '投喂打赏', // 头像下的昵称
    sign: '蜗奶奶产品永久免费使用，如果觉得有用请打赏支持才能更好的免费下去( •̀ ω •́ )✧', // 个性签名或提示文字，可使用 HTML 格式
    user_page: 'http://www.woonn.cn', // 点击头像或名字时跳转的链接，留空或删除则不跳转
    footer: '', // 页脚文字，可使用 HTML 格式
    uri_redirect: true // 若收款码 URL 是网址，是否直接跳转而不显示二维码
}

const theme = { // 主题设置
    page_bg: '#c3d7df', // 网页背景（十六进制，或图片 URL）
    card_bg: '#ffffffcc', // 卡片背景色（十六进制，可带透明度，不能是 URL）
    qrcode_bg: '#eaeffde6', // 二维码背景色（十六进制，可带透明度，不能是 URL）
    qrcode_fg: '#335eea' // 二维码颜色（十六进制，可带透明度，不能是 URL）
}

const tools = { // 右上角小工具设置
    dl_btn: true, // 二维码下载
    badge_generator: true // 徽章生成器
}

const urls = [ // 付款方式列表
    {
        name: '支付宝', // 名称
        ua: 'Alipay', // User-Agent 正则表达式
        addr: 'https://qr.alipay.com/fkx056404vuh4u7qznyrgb6' // 收款码 URL
    },
    {
        name: '微信',
        ua: 'MicroMessenger\/',
        //addr: 'wxp://f2f09vTsJNS5nfvD0LW8puM_eC0U2wUhRbe2ZSzhGnkXaJgJvIF_sqblRraoG-i3zCBm' // 使用 img 而非 addr 参数以使用小程序码
        img: 'img/zsm.jpg'
    },
    {
        name: 'QQ', 
        ua: 'QQ\/',
        //addr: 'https://i.qianbao.qq.com/wallet/sqrcode.htm?m=tenpay&f=wallet&a=1&ac=CAEQzNi87AMY2ralhwY%3D_xxx_sign&u=1032793164&n=%E3%80%80%E3%80%80%E3%80%80%E5%A5%B9%E3%80%82%F0%9F%85%A5'
        img: 'img/qqsk.png'
    }
]
