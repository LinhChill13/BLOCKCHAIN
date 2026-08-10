# Scripts tương tác với Crowdfunding

Mở Hardhat Node trong terminal thứ nhất:

```bash
npx hardhat node
```

Trong terminal thứ hai, deploy contract:

```bash
npm run deploy -- --network localhost
export CROWDFUNDING_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Luồng đầy đủ dùng campaign `0`, account số 0 là tổ chức/creator, số 1 là beneficiary, số 2 là donor và số 3 là verifier. Verifier được chọn khi chạy `campaign:create` và được khóa theo campaign:

```bash
npm run campaign:create -- --network localhost
npm run campaign:donate -- --network localhost
npm run disbursement:request -- --network localhost
npm run disbursement:approve -- --network localhost
npm run disbursement:withdraw -- --network localhost
npm run balances -- --network localhost
```

`campaign:close` chỉ dừng nhận donation; việc giải ngân không phụ thuộc vào deadline hay trạng thái đóng, mà luôn bắt buộc có verifier của campaign duyệt request trước.

## Biến tuỳ chỉnh

```bash
TARGET_ETH=2 DEADLINE_SECONDS=86400 METADATA_ID=school-fund \
VERIFIER=0x1111111111111111111111111111111111111111 \
npm run campaign:create -- --network localhost

CAMPAIGN_ID=1 DONATION_ETH=0.25 \
npm run campaign:donate -- --network localhost

CAMPAIGN_ID=1 REQUEST_ETH=0.05 \
EVIDENCE_HASH=0x1111111111111111111111111111111111111111111111111111111111111111 \
npm run disbursement:request -- --network localhost
```

`EVIDENCE_HASH` phải là bytes32 khác 0. Nếu bỏ qua, script tạo request dùng hash mẫu `keccak256("ipfs://evidence-001")`. `REQUEST_ID` mặc định là request đang hoạt động, hoặc đặt rõ khi cần.

`balances` in tổng quyên góp, đã giải ngân, số tiền còn khả dụng và request đang hoạt động để đối chiếu với số dư của contract.
