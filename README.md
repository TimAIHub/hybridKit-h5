# HybridKit 持仓 Demo

参考证券持仓首页的布局实现的独立交互 Demo：浅橙色页头、资产卡片、股票/基金汇总、回购横幅与快捷服务入口。版本 `2.0.0` 替换原先的容器能力测试首页。

所有账户、资产、行情和委托均为虚构数据，不连接证券业务接口。页面使用 HybridKit 品牌及自绘图形，不包含参考链接中的身份参数或账户信息。

## 页面与交互

- **持仓首页**：未登录占位、总资产、股票/基金汇总、金额显隐、持仓类型切换、退出演示。
- **原生登录**：HybridKit 内调用 `host.presentLogin`，使用 SDK 的离线测试账号 `demo / Demo123!`；H5 不收集或接收密码。浏览器预览提供需要主动确认的演示入口。
- **模拟买卖/撤单/记录**：100 股整数倍数量校验 → 预览确认 → 保存本机模拟委托 → 查看与撤销，最多保留 100 条。没有撮合、资金冻结或真实交易，首页资产为固定快照。
- **分包服务**：回购期限切换、虚构打新结果、资金明细、转入转出说明及更多服务。转入转出不执行资金变更。
- **容器适配**：App 内使用原生导航栏，页面标题通过 Bridge 更新；浏览器预览显示网页导航栏。所有静态依赖均随包分发，不依赖第三方 CDN。

## 本地预览与开发

源码在 `src/`，无需安装依赖：

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8080/src/main/index.html`。浏览器模式的模拟记录使用本地存储，不模拟真实原生登录。也可以直接打开 HTML 查看布局，推荐 HTTP 预览以保持页面间存储一致。

```sh
npm run build  # Python 标准库生成 ZIP、manifest 和摘要
npm test       # Node 内置测试 + 包完整性/静态依赖校验
```

| 路径 | 内容 |
| --- | --- |
| `src/main/` | 首页、样式、模拟数据、Bridge 适配、JSCore 逻辑 |
| `src/details/` | 按需加载的服务页面 |
| `scripts/build.py` | 固定时间戳、排序文件的可重复打包 |
| `scripts/verify.py` | manifest → ZIP → 文件摘要和源码一致性校验 |
| `scripts/sync_ios.py` | 显式替换现有 iOS Demo 的前端源码与资源 |
| `tests/demo.test.cjs` | 金额掩码、订单边界、Bridge 调用/失败路径测试 |
| `manifest.json`、`manifest.sha256`、`main.zip`、`details.zip` | 发布给 HybridKit 的资源文件 |

## 替换 iOS Demo

```sh
python3 scripts/sync_ios.py --sdk ../HybridKit
```

脚本会覆盖指定 SDK checkout 的 `Examples/AppletSource/` 对应文件、`Examples/HybridKitDemo/Applet/` 的四个产物以及 `Scripts/build_packages.py`。此后 SDK 仓库原有打包命令仍能生成相同资源。

运行 `HybridKitDemo` →「打开示例小程序」即可离线体验；点击「请登录」打开内置原生登录。

## 远程加载

Demo 的「远程资源」区域：

- manifest：`https://raw.githubusercontent.com/TimAIHub/hybridKit-h5/main/manifest.json`
- 资源域名白名单：`raw.githubusercontent.com`
- 可信 SHA-256：

```text
045f0f0d499b757a7fcbfdd1c0bb2d82f9d641b39749abad26f2450bd7f0cc3a
```

主包在预加载/启动时获取，`details.zip` 在首次进入服务页面时下载。已同步到 iOS Demo 的摘要随 App Bundle 分发；更新远程资源后需要同步可信摘要并重新构建 App，或在 Demo 中手动填入可信的新摘要。

```swift
let source = HKResourceSource.remote(
    URL(string: "https://raw.githubusercontent.com/TimAIHub/hybridKit-h5/main/manifest.json")!,
    manifestSHA256: trustedSHA256
)
let session = try await client.open(source)
present(session.viewController, animated: true)
```

宿主须保留 `HKClient`，配置 `resourceHosts: ["raw.githubusercontent.com"]`。生产发布建议把 URL 中的 `main` 换成完整 commit SHA，避免分支更新导致资源与摘要不一致。GitHub Raw 用于此 Demo，不作为生产资源服务承诺。

SDK 不会自动下载远程 `manifest.sha256`；SHA-256 校验不是发布者签名。本例的 `networkHosts` 为空，H5 不向外部业务服务发送请求。登录状态只保存在页面内存中；模拟记录按宿主用户保存在本机。

## 验证

2026-10-29：7 项 Node 测试通过，包摘要/文件清单/源码一致性校验通过；iOS 27 模拟器上的 9 项原生登录与容器集成测试通过，包括新增的登录 → 显隐 → 分包模拟委托 → 撤单流程。实际截图见 `docs/holdings-ios.png`。未验证物理设备与真实证券业务。
