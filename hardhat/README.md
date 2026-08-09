# Hardhat

Hardhat được tách riêng trong thư mục này. Contract nguồn vẫn được giữ nguyên tại `../SMARTCONTRACT/Smartcontract.sol`. Mỗi lệnh `compile`, `test` hoặc `deploy` tự đồng bộ contract đó vào `contracts/Crowdfunding.sol` trước khi chạy.

```bash
npm install
npm run compile
npm test
npm run deploy
npm run ignition:deploy
```

`artifacts/`, `cache/` và `node_modules/` được tạo tự động, không commit lên Git.
