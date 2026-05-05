// 确保DOM完全加载后执行
document.addEventListener('DOMContentLoaded', function() {
    // ===================== 真实化数据定义 =====================
    const CHINA_REGIONS = {
        "110000": { province: "北京市", cities: { "110101": "东城区", "110108": "海淀区" }, zipPrefix: "100" },
        "120000": { province: "天津市", cities: { "120101": "和平区", "120103": "河西区" }, zipPrefix: "300" },
        "130000": { province: "河北省", cities: { "130100": "石家庄市", "130200": "唐山市" }, zipPrefix: "050" },
        "140000": { province: "山西省", cities: { "140100": "太原市", "140200": "大同市" }, zipPrefix: "030" },
        "150000": { province: "内蒙古自治区", cities: { "150100": "呼和浩特市", "150200": "包头市" }, zipPrefix: "010" },
        "210000": { province: "辽宁省", cities: { "210100": "沈阳市", "210200": "大连市" }, zipPrefix: "110" },
        "220000": { province: "吉林省", cities: { "220100": "长春市", "220200": "吉林市" }, zipPrefix: "130" },
        "230000": { province: "黑龙江省", cities: { "230100": "哈尔滨市", "230200": "齐齐哈尔市" }, zipPrefix: "150" },
        "310000": { province: "上海市", cities: { "310101": "黄浦区", "310115": "浦东新区" }, zipPrefix: "200" },
        "320000": { province: "江苏省", cities: { "320100": "南京市", "320500": "苏州市" }, zipPrefix: "210" },
        "330000": { province: "浙江省", cities: { "330100": "杭州市", "330200": "宁波市" }, zipPrefix: "310" },
        "340000": { province: "安徽省", cities: { "340100": "合肥市", "340200": "芜湖市" }, zipPrefix: "230" },
        "350000": { province: "福建省", cities: { "350100": "福州市", "350200": "厦门市" }, zipPrefix: "350" },
        "360000": { province: "江西省", cities: { "360100": "南昌市", "360200": "景德镇市" }, zipPrefix: "330" },
        "370000": { province: "山东省", cities: { "370100": "济南市", "370200": "青岛市" }, zipPrefix: "250" },
        "410000": { province: "河南省", cities: { "410100": "郑州市", "410300": "洛阳市" }, zipPrefix: "450" },
        "420000": { province: "湖北省", cities: { "420100": "武汉市", "420500": "宜昌市" }, zipPrefix: "430" },
        "430000": { province: "湖南省", cities: { "430100": "长沙市", "430200": "株洲市" }, zipPrefix: "410" },
        "440000": { province: "广东省", cities: { "440100": "广州市", "440300": "深圳市" }, zipPrefix: "510" },
        "450000": { province: "广西壮族自治区", cities: { "450100": "南宁市", "450200": "柳州市" }, zipPrefix: "530" },
        "460000": { province: "海南省", cities: { "460100": "海口市", "460200": "三亚市" }, zipPrefix: "570" },
        "500000": { province: "重庆市", cities: { "500103": "渝中区", "500105": "江北区" }, zipPrefix: "400" },
        "510000": { province: "四川省", cities: { "510100": "成都市", "510700": "绵阳市" }, zipPrefix: "610" },
        "520000": { province: "贵州省", cities: { "520100": "贵阳市", "520200": "六盘水市" }, zipPrefix: "550" },
        "530000": { province: "云南省", cities: { "530100": "昆明市", "530500": "保山市" }, zipPrefix: "650" },
        "540000": { province: "西藏自治区", cities: { "540100": "拉萨市", "540200": "日喀则市" }, zipPrefix: "850" },
        "610000": { province: "陕西省", cities: { "610100": "西安市", "610300": "宝鸡市" }, zipPrefix: "710" },
        "620000": { province: "甘肃省", cities: { "620100": "兰州市", "620200": "嘉峪关市" }, zipPrefix: "730" },
        "630000": { province: "青海省", cities: { "630100": "西宁市", "630200": "海东市" }, zipPrefix: "810" },
        "640000": { province: "宁夏回族自治区", cities: { "640100": "银川市", "640200": "石嘴山市" }, zipPrefix: "750" },
        "650000": { province: "新疆维吾尔自治区", cities: { "650100": "乌鲁木齐市", "650200": "克拉玛依市" }, zipPrefix: "830" },
        "710000": { province: "台湾省", cities: { "710100": "台北市", "710200": "高雄市" }, zipPrefix: "100" },
        "810000": { province: "香港特别行政区", cities: { "810101": "中西区", "810102": "湾仔区" }, zipPrefix: "999077" },
        "820000": { province: "澳门特别行政区", cities: { "820101": "澳门半岛", "820102": "氹仔" }, zipPrefix: "999078" }
    };

    const GLOBAL_COUNTRIES = {
        cn: { 
            name: "中国", nameEn: "China", flag: "🇨🇳", id: "CN/zh", hasStates: true,
            mobilePrefix: ["130","131","132","133","134","135","136","137","138","139","150","151","152","153","155","156","157","158","159","170","171","172","173","175","176","177","178","180","181","182","183","184","185","186","187","188","189"],
            emailDomains: ["163.com", "126.com", "qq.com", "sina.com", "aliyun.com", "139.com"],
            streetPrefix: ["中山路", "人民路", "解放路", "建设路", "东风路", "朝阳路", "幸福路", "和平路", "振兴路", "光华路"],
            ethnicities: ["汉族", "满族", "回族", "壮族", "苗族", "维吾尔族", "彝族", "土家族"]
        },
        us: { 
            name: "美国", nameEn: "United States", flag: "🇺🇸", id: "US/en", hasStates: true,
            states: {
                "CA": { name: "California", cities: ["Los Angeles","San Francisco"], zipPrefix: ["900","941"] },
                "NY": { name: "New York", cities: ["New York City","Buffalo"], zipPrefix: ["100","142"] },
                "TX": { name: "Texas", cities: ["Houston","Dallas"], zipPrefix: ["770","752"] },
                "FL": { name: "Florida", cities: ["Miami","Orlando"], zipPrefix: ["331","328"] }
            },
            mobilePrefix: ["201","202","203","205","206","207","208","209","210","212"],
            emailDomains: ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "aol.com"],
            streetPrefix: ["Main St", "Park Ave", "Oak St", "Pine St", "Maple Ave", "Cedar St", "Elm St", "Washington St"],
            ethnicities: ["White", "Black/African American", "Asian", "Hispanic/Latino", "Native American"]
        },
        uk: { 
            name: "英国", nameEn: "United Kingdom", flag: "🇬🇧", id: "UK/en", hasStates: true,
            states: {
                "EN": { name: "England", cities: ["London","Manchester","Birmingham"], zipPrefix: ["SW1","M1","B1"] },
                "SC": { name: "Scotland", cities: ["Edinburgh","Glasgow"], zipPrefix: ["EH1","G1"] },
                "WLS": { name: "Wales", cities: ["Cardiff","Swansea"], zipPrefix: ["CF1","SA1"] }
            },
            mobilePrefix: ["07400","07401","07402","07403","07404","07700","07701","07702"],
            emailDomains: ["gmail.com", "yahoo.co.uk", "outlook.com", "btinternet.com", "sky.com"],
            streetPrefix: ["High St", "Station Rd", "Main St", "Park Rd", "Church St", "Oxford St", "Cambridge Rd"],
            ethnicities: ["White British", "Asian British", "Black British", "Mixed", "Other"]
        },
        jp: { 
            name: "日本", nameEn: "Japan", flag: "🇯🇵", id: "JP/ja", hasStates: true,
            states: {
                "TK": { name: "東京都", cities: ["新宿区","渋谷区","千代田区"], zipPrefix: ["160","150","100"] },
                "KS": { name: "神奈川県", cities: ["横浜市","川崎市"], zipPrefix: ["220","210"] },
                "OS": { name: "大阪府", cities: ["大阪市","堺市"], zipPrefix: ["530","590"] }
            },
            mobilePrefix: ["090","080","070"],
            emailDomains: ["gmail.com", "yahoo.co.jp", "outlook.jp", "docomo.ne.jp", "au.com"],
            streetPrefix: ["通り", "町", "道", "街", "台", "浜"],
            ethnicities: ["大和族", "琉球族", "阿伊努族", "朝鲜族", "华裔"]
        },
        de: { 
            name: "德国", nameEn: "Germany", flag: "🇩🇪", id: "DE/de", hasStates: true,
            states: {
                "BE": { name: "Berlin", cities: ["Berlin"], zipPrefix: ["101","102","103"] },
                "BY": { name: "Bayern", cities: ["München","Nürnberg"], zipPrefix: ["803","904"] },
                "NW": { name: "Nordrhein-Westfalen", cities: ["Köln","Düsseldorf"], zipPrefix: ["506","402"] }
            },
            mobilePrefix: ["0151","0152","0155","0170","0171","0172","0173","0174"],
            emailDomains: ["gmail.com", "web.de", "gmx.de", "t-online.de", "yahoo.de"],
            streetPrefix: ["Hauptstraße", "Bahnhofstraße", "Parkstraße", "Bergstraße", "Wiesenstraße"],
            ethnicities: ["Deutsch", "Türkisch", "Polnisch", "Italienisch", "Französisch"]
        },
        fr: { 
            name: "法国", nameEn: "France", flag: "🇫🇷", id: "FR/fr", hasStates: true,
            states: {
                "IDF": { name: "Île-de-France", cities: ["Paris","Versailles"], zipPrefix: ["750","780"] },
                "PR": { name: "Provence", cities: ["Marseille","Nice"], zipPrefix: ["130","060"] },
                "NA": { name: "Nouvelle-Aquitaine", cities: ["Bordeaux","Lyon"], zipPrefix: ["330","690"] }
            },
            mobilePrefix: ["060","061","062","063","064","070","071","072"],
            emailDomains: ["gmail.com", "orange.fr", "sfr.fr", "free.fr", "laposte.net"],
            streetPrefix: ["Rue de", "Avenue de", "Boulevard de", "Rue du", "Avenue du"],
            ethnicities: ["Français", "Algérien", "Marocain", "Portugais", "Espagnol"]
        },
        sg: { 
            name: "新加坡", nameEn: "Singapore", flag: "🇸🇬", id: "SG/zh", hasStates: false, 
            cities: ["Singapore"],
            zipPrefix: ["10","20","30","40","50"],
            mobilePrefix: ["81","82","83","84","85","86","87","90","91","92"],
            emailDomains: ["gmail.com", "yahoo.com.sg", "singnet.com.sg", "starhub.net.sg"],
            streetPrefix: ["North Rd", "South Ave", "East Coast Rd", "West Coast Rd", "Orchard Rd"],
            ethnicities: ["Chinese", "Malay", "Indian", "Eurasian"]
        }
    };

    // ===================== 工具函数 =====================
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomItem = (arr) => arr[rand(0, arr.length - 1)];
    const randomStr = (len, chars = '0123456789') => Array(len).fill('').map(() => randomItem(chars)).join('');

    // 中国身份证校验码（国标GB11643-1999）
    const getCheckCode = (id17) => {
        const w = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
        const c = ['1','0','X','9','8','7','6','5','4','3','2'];
        return c[id17.split('').reduce((s,n,i) => s + (+n)*w[i], 0) % 11];
    };

    // 吐司提示
    function showToast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._t);
        t._t = setTimeout(() => t.classList.remove('show'), 2000);
    }

    // 区县代码推导
    function getDistrictFromCity(cityCode) {
        if (cityCode.length === 6) return cityCode;
        if (['110000','120000','310000','500000'].includes(cityCode)) return cityCode.slice(0,4) + '01';
        return cityCode + '01';
    }

    // 生成真实邮编
    function generateZipCode(country, provinceCode) {
        if (country === 'cn') {
            const zipPrefix = CHINA_REGIONS[provinceCode]?.zipPrefix || '100';
            return zipPrefix + randomStr(3);
        }
        const countryData = GLOBAL_COUNTRIES[country];
        if (countryData.hasStates) {
            const stateData = countryData.states[provinceCode];
            const zipPre = randomItem(stateData.zipPrefix);
            return zipPre + randomStr(2);
        } else {
            const zipPre = randomItem(countryData.zipPrefix);
            return zipPre + randomStr(3);
        }
    }

    // 生成真实手机号
    function generateMobile(country) {
        const countryData = GLOBAL_COUNTRIES[country];
        const prefix = randomItem(countryData.mobilePrefix);
        const suffix = randomStr(country === 'cn' ? 8 : (country === 'jp' ? 8 : 7));
        if (country === 'us') return `+1-${prefix}-${suffix.slice(0,3)}-${suffix.slice(3)}`;
        if (country === 'uk') return `+44-${prefix}-${suffix}`;
        if (country === 'jp') return `+81-${prefix}-${suffix}`;
        if (country === 'de') return `+49-${prefix}-${suffix}`;
        if (country === 'fr') return `+33-${prefix}-${suffix}`;
        if (country === 'sg') return `+65-${prefix}${suffix}`;
        return prefix + suffix;
    }

    // 生成真实街道地址
    function generateStreet(country) {
        const countryData = GLOBAL_COUNTRIES[country];
        const prefix = randomItem(countryData.streetPrefix);
        const num = rand(1, 9999);
        if (country === 'cn') return `${num}号 ${prefix}`;
        if (country === 'jp') return `${num}番地 ${prefix}`;
        if (country === 'de') return `${num} ${prefix}`;
        if (country === 'fr') return `${prefix} ${num}`;
        return `${num} ${prefix}`;
    }

    // 生成真实邮箱
    function generateEmail(nameEn, country) {
        const countryData = GLOBAL_COUNTRIES[country];
        const domain = randomItem(countryData.emailDomains);
        let name = nameEn.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        if (!name || name === '.') name = 'user';
        const suffix = rand(10, 999);
        return `${name}${suffix}@${domain}`;
    }

    // ===================== 初始化下拉框 =====================
    function initAgeSelect() {
        const sel = document.getElementById('ageSelect');
        if (!sel) return;
        sel.innerHTML = '';
        for (let i=16; i<=70; i++) {
            const opt = document.createElement('option');
            opt.value = i; 
            opt.textContent = i;
            if (i === 30) opt.selected = true;
            sel.appendChild(opt);
        }
    }

    function initCountries() {
        const countrySel = document.getElementById('countrySelect');
        if (!countrySel) return;
        countrySel.innerHTML = '';
        // [NEW] 按英文名排序国家
        const sortedCountries = Object.entries(GLOBAL_COUNTRIES).sort((a,b) => a[1].nameEn.localeCompare(b[1].nameEn));
        sortedCountries.forEach(([code, obj]) => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = `${obj.flag} ${obj.name}`;
            countrySel.appendChild(opt);
        });
        countrySel.value = 'us';
        countrySel.addEventListener('change', onCountryChange);
        onCountryChange();
    }

    function onCountryChange() {
        const countrySel = document.getElementById('countrySelect');
        const provinceGroup = document.getElementById('provinceGroup');
        const cityGroup = document.getElementById('cityGroup');
        if (!countrySel || !provinceGroup || !cityGroup) return;

        const country = countrySel.value;
        const info = GLOBAL_COUNTRIES[country];
        
        const provinceSel = document.getElementById('provinceSelect');
        const citySel = document.getElementById('citySelect');
        if (provinceSel) provinceSel.innerHTML = '';
        if (citySel) citySel.innerHTML = '';

        if (info.hasStates) {
            provinceGroup.style.display = 'flex';
            cityGroup.style.display = 'flex';
            if (country === 'cn') {
                buildChinaProvince();
            } else {
                buildForeignStates(country);
            }
        } else {
            provinceGroup.style.display = 'none';
            cityGroup.style.display = 'none';
            if (info.cities) {
                buildDirectCity(info.cities);
                cityGroup.style.display = 'flex';
            }
        }
        generateAndDisplay();
    }

    // [NEW] 中国省份按拼音排序
    function buildChinaProvince() {
        const provSel = document.getElementById('provinceSelect');
        if (!provSel) return;
        provSel.innerHTML = '';
        const sorted = Object.entries(CHINA_REGIONS).sort((a, b) => a[1].province.localeCompare(b[1].province, 'zh'));
        sorted.forEach(([code, obj]) => {
            const opt = document.createElement('option');
            opt.value = code; 
            opt.textContent = obj.province;
            provSel.appendChild(opt);
        });
        provSel.removeEventListener('change', buildChinaCities);
        provSel.addEventListener('change', buildChinaCities);
        buildChinaCities();
    }

    // [NEW] 中国城市按中文拼音排序
    function buildChinaCities() {
        const provSel = document.getElementById('provinceSelect');
        const citySel = document.getElementById('citySelect');
        if (!provSel || !citySel) return;

        const provCode = provSel.value;
        const cities = CHINA_REGIONS[provCode]?.cities || {};
        citySel.innerHTML = '';
        const sorted = Object.entries(cities).sort((a, b) => a[1].localeCompare(b[1], 'zh'));
        sorted.forEach(([code, name]) => {
            const opt = document.createElement('option');
            opt.value = code; 
            opt.textContent = name;
            citySel.appendChild(opt);
        });
    }

    // [NEW] 外国州按字母排序
    function buildForeignStates(countryCode) {
        const provSel = document.getElementById('provinceSelect');
        if (!provSel) return;

        const states = GLOBAL_COUNTRIES[countryCode].states;
        provSel.innerHTML = '';
        const sorted = Object.entries(states).sort((a, b) => a[1].name.localeCompare(b[1].name));
        sorted.forEach(([code, obj]) => {
            const opt = document.createElement('option');
            opt.value = code; 
            opt.textContent = obj.name;
            provSel.appendChild(opt);
        });
        provSel.removeEventListener('change', () => buildForeignCities(countryCode));
        provSel.addEventListener('change', () => buildForeignCities(countryCode));
        buildForeignCities(countryCode);
    }

    // [NEW] 外国城市按字母排序
    function buildForeignCities(countryCode) {
        const provSel = document.getElementById('provinceSelect');
        const citySel = document.getElementById('citySelect');
        if (!provSel || !citySel) return;

        const stateCode = provSel.value;
        const cities = GLOBAL_COUNTRIES[countryCode].states[stateCode]?.cities || [];
        citySel.innerHTML = '';
        const sorted = [...cities].sort();
        sorted.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city; 
            opt.textContent = city;
            citySel.appendChild(opt);
        });
    }

    function buildDirectCity(cities) {
        const citySel = document.getElementById('citySelect');
        if (!citySel) return;

        citySel.innerHTML = '';
        const sorted = [...cities].sort();
        sorted.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city; 
            opt.textContent = city;
            citySel.appendChild(opt);
        });
    }

    // ===================== 身份生成 =====================
    function generateChineseIdentity(override = {}) {
        const ageSel = document.getElementById('ageSelect');
        const genderSel = document.getElementById('genderSelect');
        const citySel = document.getElementById('citySelect');
        const provSel = document.getElementById('provinceSelect');
        if (!ageSel || !genderSel || !citySel || !provSel) return null;

        const age = parseInt(ageSel.value) || 30;
        const birthYear = override.birth?.[0] || (new Date().getFullYear() - age);
        const month = override.birth?.[1] || String(rand(1,12)).padStart(2,'0');
        const day = override.birth?.[2] || String(rand(1, new Date(birthYear, month, 0).getDate())).padStart(2,'0');
        
        let gender = genderSel.value;
        gender = gender === 'random' ? (Math.random() < 0.5 ? 'male' : 'female') : gender;
        
        const districtCode = override.district || getDistrictFromCity(citySel.value);
        const provCode = provSel.value;
        
        const surnames = ["王","李","张","刘","陈","杨","黄","赵","吴","周","徐","孙","马","朱","胡","林","郭","何","高","罗"];
        const maleNames = ["伟","强","磊","涛","杰","浩","明","超","宇","轩","博","航","泽","宸","睿","铭","辰","阳","俊","豪"];
        const femaleNames = ["娜","敏","静","丽","婷","芳","雪","怡","燕","琳","欣","妍","瑶","琪","萱","雨","菲","梦","佳","思"];
        const sn = randomItem(surnames);
        const given = gender === 'male' ? randomItem(maleNames) : randomItem(femaleNames);
        const nameCn = sn + given;
        const nameEn = given + ' ' + sn;
        
        const order = override.order || String(rand(0,999)).padStart(3,'0');
        const finalOrder = gender === 'male' 
            ? String(parseInt(order) % 2 === 0 ? parseInt(order) + 1 : parseInt(order)).padStart(3,'0')
            : String(parseInt(order) % 2 !== 0 ? parseInt(order) + 1 : parseInt(order)).padStart(3,'0');
        const id17 = districtCode + birthYear + month + day + finalOrder;
        const idCard = id17 + getCheckCode(id17);
        
        const street = generateStreet('cn');
        const zipCode = generateZipCode('cn', provCode);
        const provinceName = CHINA_REGIONS[provCode]?.province || '';
        const cityName = citySel.options[citySel.selectedIndex]?.text || '';
        const cityStateZipCn = `${provinceName} ${cityName} 邮编 ${zipCode}`;
        const cityStateZipEn = `${provinceName} ${cityName}, Zip Code ${zipCode}`;
        const telephone = `0${districtCode.slice(0,2)}${randomStr(8)}`;
        const mobile = generateMobile('cn');
        const email = generateEmail(nameEn, 'cn');
        const raceCn = randomItem(GLOBAL_COUNTRIES.cn.ethnicities);
        const raceEn = {
            "汉族": "Han", "满族": "Manchu", "回族": "Hui", "壮族": "Zhuang", 
            "苗族": "Miao", "维吾尔族": "Uyghur", "彝族": "Yi", "土家族": "Tujia"
        }[raceCn] || raceCn;

        return {
            nameCn, nameEn,
            countryNameEn: GLOBAL_COUNTRIES.cn.nameEn,
            genderTextCn: gender === 'male' ? '男' : '女',
            genderTextEn: gender === 'male' ? 'Male' : 'Female',
            raceCn, raceEn,
            birthdayCn: `${birthYear}年${month}月${day}日`,
            birthdayEn: `${month}/${day}/${birthYear}`,
            ageCn: `${age} 岁`,
            ageEn: `${age} years old`,
            idCard,
            streetCn: street,
            streetEn: street,
            cityStateZipCn, cityStateZipEn,
            telephoneCn: telephone,
            telephoneEn: `+86-${telephone.slice(1)}`,
            mobileCn: mobile,
            mobileEn: `+86-${mobile}`,
            email,
            isCn: true
        };
    }

    function generateForeignIdentity(country) {
        const ageSel = document.getElementById('ageSelect');
        const genderSel = document.getElementById('genderSelect');
        const provSel = document.getElementById('provinceSelect');
        const citySel = document.getElementById('citySelect');
        if (!ageSel || !genderSel || !provSel || !citySel) return null;

        const age = parseInt(ageSel.value) || 30;
        const birthYear = new Date().getFullYear() - age;
        const month = String(rand(1,12)).padStart(2,'0');
        const day = String(rand(1, new Date(birthYear, month, 0).getDate())).padStart(2,'0');
        
        let gender = genderSel.value;
        gender = gender === 'random' ? (Math.random() < 0.5 ? 'male' : 'female') : gender;
        
        let state = '', city = '';
        if (GLOBAL_COUNTRIES[country].hasStates) {
            state = provSel.options[provSel.selectedIndex]?.text || '';
            city = citySel.value;
        } else {
            city = citySel.value || GLOBAL_COUNTRIES[country].cities[0];
        }
        
        const nameData = {
            us: {
                male: ["James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles"],
                female: ["Mary","Patricia","Jennifer","Linda","Elizabeth","Barbara","Susan","Jessica","Sarah","Margaret"],
                last: ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez"]
            },
            uk: {
                male: ["James","Oliver","Harry","George","Noah","William","Arthur","Leo","Freddie","Alfie"],
                female: ["Olivia","Amelia","Isla","Ava","Emily","Sophia","Lily","Grace","Evie","Poppy"],
                last: ["Smith","Jones","Williams","Brown","Taylor","Davies","Wilson","Evans","Thomas","Johnson"]
            },
            jp: {
                male: ["タロウ","ヒロシ","アキラ","ケンタ","リョウ","ユウキ","シンイチ","マサル","ヨシヒロ","トモヤ"],
                female: ["ユミ","マヤ","アオイ","ハナ","ミサキ","リナ","サキ","ヨウコ","エリ","ナナ"],
                last: ["佐藤","鈴木","高橋","田中","伊藤","渡辺","山本","中村","小林","加藤"]
            },
            de: {
                male: ["Max","Lukas","Leon","Felix","Jonas","Paul","Elias","Noah","Finn","Ben"],
                female: ["Emma","Sophia","Hannah","Emilia","Mia","Lina","Lena","Anna","Lea","Johanna"],
                last: ["Müller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Schulz","Hoffmann"]
            },
            fr: {
                male: ["Jean","Pierre","Jacques","Michel","Philippe","Marc","Paul","Henri","Louis","François"],
                female: ["Marie","Bernadette","Françoise","Isabelle","Nathalie","Sylvie","Anne","Dominique","Catherine","Christine"],
                last: ["Martin","Bernard","Dubois","Thomas","Robert","Richard","Petit","Durand","Leroy","Moreau"]
            },
            sg: {
                male: ["Wei","Jian","Hao","Jun","Yi","Xiang","Yong","Kai","Ren","Zhi"],
                female: ["Mei","Ling","Hui","Ying","Xin","Jie","Yan","Li","Siying","Min"],
                last: ["Tan","Lee","Ng","Lim","Wong","Chua","Goh","Chen","Teo","Ong"]
            }
        };
        const nd = nameData[country];
        const firstName = gender === 'male' ? randomItem(nd.male) : randomItem(nd.female);
        const lastName = randomItem(nd.last);
        const nameEn = `${firstName} ${lastName}`;
        const nameCn = country === 'sg' ? `${lastName}${firstName}` : `${lastName}·${firstName}`;
        
        const idCard = `${country.toUpperCase()}-${rand(1000000,9999999)}`;
        const street = generateStreet(country);
        const zipCode = generateZipCode(country, provSel.value);
        const cityStateZipEn = `${city}, ${state || ''}, ${zipCode}`;
        const cityStateZipCn = `${city} ${state || ''} 邮编 ${zipCode}`;
        const telephone = country === 'us' ? `+1-${rand(200,999)}-${rand(100,999)}-${rand(1000,9999)}` : 
                          country === 'uk' ? `+44-${rand(10000,99999)}-${rand(100000,999999)}` :
                          country === 'jp' ? `+81-${rand(3,9)}${randomStr(8)}` :
                          country === 'de' ? `+49-${rand(100,999)}-${randomStr(7)}` :
                          country === 'fr' ? `+33-${rand(10,99)}-${randomStr(8)}` :
                          `+65-${rand(1000,9999)}-${rand(1000,9999)}`;
        const mobile = generateMobile(country);
        const email = generateEmail(nameEn, country);
        const raceEn = randomItem(GLOBAL_COUNTRIES[country].ethnicities);
        const raceCn = {
            "White": "白人", "Black/African American": "黑人", "Asian": "亚裔", "Hispanic/Latino": "拉丁裔",
            "Native American": "原住民", "White British": "英国白人", "Asian British": "亚裔英国人",
            "Black British": "黑人英国人", "Mixed": "混血", "Other": "其他", "大和族": "大和族",
            "琉球族": "琉球族", "阿伊努族": "阿伊努族", "朝鲜族": "朝鲜族", "华裔": "华裔",
            "Deutsch": "德意志人", "Türkisch": "土耳其人", "Polnisch": "波兰人",
            "Italienisch": "意大利人", "Français": "法兰西人", "Algérien": "阿尔及利亚裔",
            "Marocain": "摩洛哥裔", "Portugais": "葡萄牙裔", "Espagnol": "西班牙裔",
            "Chinese": "华人", "Malay": "马来人", "Indian": "印度人", "Eurasian": "欧亚裔"
        }[raceEn] || raceEn;

        return {
            nameCn, nameEn,
            countryNameEn: GLOBAL_COUNTRIES[country].nameEn,
            genderTextCn: gender === 'male' ? '男' : '女',
            genderTextEn: gender === 'male' ? 'Male' : 'Female',
            raceCn, raceEn,
            birthdayCn: `${birthYear}年${month}月${day}日`,
            birthdayEn: `${month}/${day}/${birthYear}`,
            ageCn: `${age} 岁`,
            ageEn: `${age} years old`,
            idCard,
            streetCn: street,
            streetEn: street,
            cityStateZipCn, cityStateZipEn,
            telephoneCn: telephone,
            telephoneEn: telephone,
            mobileCn: mobile,
            mobileEn: mobile,
            email,
            isCn: false
        };
    }

    // 身份信息展示
    function displayIdentity(data) {
        if (!data) return;
        const isCN = data.isCn;
        
        const nameCnEl = document.getElementById('nameCn');
        const nameEnEl = document.getElementById('nameEn');
        if (nameCnEl) nameCnEl.textContent = isCN ? data.nameCn : '';
        if (nameEnEl) nameEnEl.textContent = isCN ? '' : data.nameEn;
        
        const countryDisplayEl = document.getElementById('countryDisplay');
        if (countryDisplayEl) countryDisplayEl.textContent = data.countryNameEn;
        
        const valueHtml = (cnVal, enVal) => isCN ? cnVal : enVal;
        
        const genderTextEl = document.getElementById('genderText');
        if (genderTextEl) genderTextEl.textContent = valueHtml(data.genderTextCn, data.genderTextEn);
        
        const raceEl = document.getElementById('race');
        if (raceEl) raceEl.textContent = valueHtml(data.raceCn, data.raceEn);
        
        const birthdayEl = document.getElementById('birthday');
        if (birthdayEl) birthdayEl.textContent = valueHtml(data.birthdayCn, data.birthdayEn);
        
        const ageEl = document.getElementById('age');
        if (ageEl) ageEl.textContent = valueHtml(data.ageCn, data.ageEn);
        
        const idCardEl = document.getElementById('idCard');
        if (idCardEl) idCardEl.textContent = data.idCard;
        
        const streetEl = document.getElementById('street');
        if (streetEl) streetEl.textContent = valueHtml(data.streetCn, data.streetEn);
        
        const cityStateZipEl = document.getElementById('cityStateZip');
        if (cityStateZipEl) cityStateZipEl.textContent = valueHtml(data.cityStateZipCn, data.cityStateZipEn);
        
        const telephoneEl = document.getElementById('telephone');
        if (telephoneEl) telephoneEl.textContent = valueHtml(data.telephoneCn, data.telephoneEn);
        
        const mobileEl = document.getElementById('mobile');
        if (mobileEl) mobileEl.textContent = valueHtml(data.mobileCn, data.mobileEn);
        
        const emailEl = document.getElementById('email');
        if (emailEl) emailEl.textContent = data.email;
        
        const identityCardEl = document.getElementById('identityCard');
        if (identityCardEl) identityCardEl.style.display = 'block';
    }

    function generateAndDisplay() {
        const countrySel = document.getElementById('countrySelect');
        if (!countrySel) return;

        const country = countrySel.value;
        let data = null;
        if (country === 'cn') {
            data = generateChineseIdentity();
        } else {
            data = generateForeignIdentity(country);
        }
        displayIdentity(data);
    }

    // [NEW] 补全逻辑优化：自动修正校验位，检测性别冲突
    function completeId() {
        const inputEl = document.getElementById('idQueryInput');
        const genderEl = document.getElementById('idGenderInput');
        if (!inputEl) return;

        let input = inputEl.value.trim().toUpperCase();
        const genderVal = genderEl ? genderEl.value : 'random';

        // 18位情况：自动校验并修正
        if (/^\d{17}[\dX]$/.test(input)) {
            const id17 = input.slice(0, 17);
            const correctCheck = getCheckCode(id17);
            if (input[17] !== correctCheck) {
                inputEl.value = id17 + correctCheck;
                showToast(`校验位已修正为 ${correctCheck}`);
            } else {
                // 校验正确，检查性别一致性
                const orderCode = parseInt(id17.slice(14, 17));
                const impliedGender = orderCode % 2 === 1 ? 'male' : 'female';
                if (genderVal !== 'random' && genderVal !== impliedGender) {
                    showToast('身份证性别与选择不一致，请检查');
                } else {
                    showToast('已是合法身份证号码');
                }
            }
            return;
        }

        // 非18位时按位补全（保持原有逻辑）
        const digits = input.replace(/[^0-9]/g, '');
        const len = digits.length;
        if (len === 0) {
            showToast('请输入至少一位数字');
            return;
        }

        let addr = '', birth = '', order = '';

        // 地址码
        if (len >= 6) {
            addr = digits.slice(0, 6);
            const provCode = addr.slice(0,2) + '0000';
            if (!CHINA_REGIONS[provCode]) {
                showToast('地址码无效，请检查前6位');
                return;
            }
        } else {
            addr = digits.padEnd(6, '0');
            const provCode = addr.slice(0,2) + '0000';
            if (!CHINA_REGIONS[provCode]) addr = '110101';
        }

        // 出生日期
        if (len >= 14) {
            birth = digits.slice(6, 14);
            const y = parseInt(birth.slice(0,4));
            const m = parseInt(birth.slice(4,6));
            const d = parseInt(birth.slice(6,8));
            if (y < 1900 || y > new Date().getFullYear() || m < 1 || m > 12 || d < 1 || d > new Date(y, m, 0).getDate()) {
                showToast('出生日期无效，将随机生成');
                birth = '';
            }
        }
        if (!birth) {
            const year = rand(new Date().getFullYear() - 60, new Date().getFullYear() - 18);
            const month = rand(1, 12);
            const day = rand(1, new Date(year, month, 0).getDate());
            birth = year + String(month).padStart(2,'0') + String(day).padStart(2,'0');
        }

        // 顺序码
        let genderNum = null;
        if (genderVal === 'male') genderNum = 1;
        else if (genderVal === 'female') genderNum = 0;
        else genderNum = Math.random() < 0.5 ? 1 : 0;

        if (len >= 17) {
            order = digits.slice(14, 17);
        } else if (len === 16) {
            const prefix = digits.slice(14, 16);
            let lastDigit;
            if (genderNum === 1) {
                lastDigit = rand(1, 9);
                lastDigit = lastDigit % 2 === 0 ? lastDigit + 1 : lastDigit;
            } else {
                lastDigit = rand(0, 8);
                lastDigit = lastDigit % 2 === 1 ? lastDigit + 1 : lastDigit;
            }
            order = prefix + String(lastDigit % 10);
        } else {
            let orderNum = rand(0, 999);
            if (genderNum === 1) orderNum = orderNum % 2 === 0 ? orderNum + 1 : orderNum;
            else orderNum = orderNum % 2 === 1 ? orderNum + 1 : orderNum;
            order = String(orderNum).padStart(3, '0');
        }

        const id17 = addr + birth + order;
        const idCard = id17 + getCheckCode(id17);
        inputEl.value = idCard;
        showToast('已补全为合法18位身份证号码');
    }
    // [NEW] 结束

    // ===================== 绑定事件 =====================
    function bindEvents() {
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.removeEventListener('click', generateAndDisplay);
            generateBtn.addEventListener('click', generateAndDisplay);
        }

        const idCompleteBtn = document.getElementById('idCompleteBtn');
        if (idCompleteBtn) {
            idCompleteBtn.removeEventListener('click', completeId);
            idCompleteBtn.addEventListener('click', completeId);
        }

        const idQueryInput = document.getElementById('idQueryInput');
        if (idQueryInput) {
            idQueryInput.removeEventListener('keypress', function(e) {
                if (e.key === 'Enter') completeId();
            });
            idQueryInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') completeId();
            });
        }
    }

    // ===================== 初始化 =====================
    initAgeSelect();
    initCountries();
    bindEvents();
    generateAndDisplay();
});
