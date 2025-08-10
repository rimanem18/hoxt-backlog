## Hoxt-backlog

ドメイン駆動設計とクリーンアーキテクチャで、Backlog、BacklogItem、Task の3つの集約構造でまずは ToDo アプリを作り、その後、バックログ管理アプリに成長させる予定です。

### Version
- Docker v28.1
- Docker Compose v2.35
- Bun v1.2
- Next v15.4
- Hono v4.9

### 起動方法

コンテナをビルド
```sh
make build
```

コンテナを起動
```sh
make up
```

サーバーからフェッチした文字列で、鮮やかな Hello World が表示されます。

<img width="1143" height="346" alt="image" src="https://github.com/user-attachments/assets/65dd41c0-4ca7-4558-ae87-197347bda2c8" />

コンテナを終了
```sh
make down
```
