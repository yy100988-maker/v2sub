// CFvpn 补丁：跳过失效的直连，直接走反代(proxyip)兜底路径
//
// 背景：本部署中 Worker 的出站直连（request.fetcher.connect）对所有目标均失败，
//       唯一可用的出站通路是反代(proxyip)。而域名目标原本走不到反代兜底，
//       导致 Clash 用 www.gstatic.com 做延迟测试时全部节点显示失败。
//
// 做法：把 connectDirect(...) 调用替换为立即抛出普通 Error，
//       交由紧随其后的 catch 分支执行 connecttoPry()（该分支内部会调用 安装当前连接）。
//       这正是 IP 目标此前能够工作的路径，现将其应用于所有目标。
//
// 上游修复后可删除本文件及 workflow 中的「🩹 Patch」步骤。
const fs = require('fs');

const FILE = 'origin.js';
const FROM = 'const initialSocket = await connectDirect(host, portNum, rawData, true);';
const TO = 'const initialSocket = await (async () => { throw new Error("[CFvpn patch] skip direct dial, use reverse proxy"); })();';

let src = fs.readFileSync(FILE, 'utf8');
if (!src.includes(FROM)) {
  console.log('::error::PATCH TARGET NOT FOUND — 上游 origin.js 已变更，请更新 patch.js 的 FROM 常量后重试');
  process.exit(1);
}
fs.writeFileSync(FILE, src.replace(FROM, TO));
console.log('✅ patched: 直连已跳过，所有目标改走反代路径');
