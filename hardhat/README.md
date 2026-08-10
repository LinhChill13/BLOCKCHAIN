# Hardhat

Hardhat được tách riêng trong thư mục này. Contract nguồn nằm tại `../SMARTCONTRACT/Smartcontract.sol`. Mỗi lệnh `compile`, `test` hoặc `deploy` tự đồng bộ contract đó vào `contracts/Crowdfunding.sol` trước khi chạy.

Mỗi campaign nhận địa chỉ `verifier` khi được tạo. Quy trình giải ngân là: beneficiary tạo request gồm amount + `evidenceHash`, verifier của campaign duyệt, beneficiary rút đúng amount đã duyệt. Verifier không thể đổi sau khi tạo campaign; campaign mới có thể chọn ví verifier khác. Xem [`scripts/README.md`](scripts/README.md) để chạy luồng local hoàn chỉnh.

```bash
npm install
npm run compile
npm test
npm run deploy
npm run ignition:deploy
```

Khi chạy Sepolia, đặt `VERIFIER` lúc chạy `campaign:create` và `SEPOLIA_VERIFIER_PRIVATE_KEY` nếu muốn chạy script duyệt bằng account đó.

`artifacts/`, `cache/` và `node_modules/` được tạo tự động, không commit lên Git.
