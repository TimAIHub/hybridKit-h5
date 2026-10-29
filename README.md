# HybridKit H5 Demo 资源包

供 HybridKit 通用容器远程加载的前端资源，使用 HybridKit 自定义 manifest / ZIP 格式。

| 文件 | 用途 |
| --- | --- |
| `manifest.json` | 页面、Bridge 白名单、主包/分包和逐文件摘要 |
| `manifest.sha256` | manifest 原始字节的 SHA-256，供可信发布渠道分发 |
| `main.zip` | 首页、输入测试、原生登录 Bridge 示例和 JS 逻辑层 |
| `details.zip` | 按需加载的详情页分包 |

## Demo 配置

在 HybridKitDemo 首页的「远程资源」区域填写：

- manifest 地址：`https://raw.githubusercontent.com/TimAIHub/hybridKit-h5/main/manifest.json`
- 允许的资源域名：`raw.githubusercontent.com`
- 可信 SHA-256：`ccfacf4a264c38b715c7e9d25f1a16a5828a8082febbef1fdeae3d7c99997f3e`

点击「仅预加载主包」或「下载并打开远程小程序」。进入详情页时按需下载 `details.zip`。上述地址要求仓库可公开读取；私有仓库不能直接使用匿名 Raw URL。

```swift
let client = try HKClient(configuration: HKConfiguration(
    root: applicationSupportURL.appendingPathComponent("HybridKitRemote"),
    userID: "alice",
    resourceHosts: ["raw.githubusercontent.com"]
))
// 宿主需保留 client 的强引用，并按示例需要注册 host.echo 等宿主扩展。
let source = HKResourceSource.remote(
    URL(string: "https://raw.githubusercontent.com/TimAIHub/hybridKit-h5/main/manifest.json")!,
    manifestSHA256: "ccfacf4a264c38b715c7e9d25f1a16a5828a8082febbef1fdeae3d7c99997f3e"
)
let session = try await client.open(source)
present(session.viewController, animated: true)
```

正式发布建议把 URL 中的 `main` 换成对应完整 commit SHA，并将可信摘要固定在宿主配置中，避免分支更新后 URL 与摘要不匹配。SDK 校验 manifest、ZIP 及解包文件，不会自动获取远程 `manifest.sha256`。

此仓库包含演示资源；原生登录是 `demo / Demo123!` 的离线模拟，需要在 HybridKit 容器中通过 Bridge 调用。ZIP 不能作为普通网页直接运行。

## 更新资源

在 HybridKit 源码仓库执行 `python3 Scripts/build_packages.py`，将生成目录 `Examples/HybridKitDemo/Applet/` 的四个文件一起复制到本仓库，并同步更新本文摘要。不要单独修改 manifest 格式或替换 ZIP。

校验 manifest：

```sh
shasum -a 256 manifest.json
cat manifest.sha256
```

SHA-256 提供完整性校验，不是发布者签名；可信摘要应由宿主或独立可信发布渠道提供。
