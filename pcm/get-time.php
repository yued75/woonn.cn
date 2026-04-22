<?php
// 允许跨域（可选，但如果同域则不需要）
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// 请求苏宁时间接口
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://quan.suning.com/getSysTime.do');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    // 直接返回苏宁的 JSON 数据（原样返回，前端无需修改解析逻辑）
    echo $response;
} else {
    // 失败时返回错误信息
    echo json_encode(['error' => '时间服务暂时不可用']);
}
?>
