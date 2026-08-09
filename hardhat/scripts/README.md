# Scripts tương tác với Crowdfunding

Mở Hardhat Node trong terminal thứ nhất:

```bash
npx hardhat node
```

Trong terminal thứ hai, deploy contract rồi đặt địa chỉ contract vào biến môi trường:

```bash
npm run deploy -- --network localhost
export CROWDFUNDING_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Sau đó chạy lần lượt các thao tác. Mặc định các script dùng campaign `0`, account local số 0 làm creator, số 1 làm beneficiary và số 2 làm donor.

```bash
npm run campaign:create -- --network localhost
npm run campaign:donate -- --network localhost
npm run campaign:close -- --network localhost
npm run campaign:withdraw -- --network localhost
npm run balances -- --network localhost
```

Ví dụ tùy chỉnh dữ liệu campaign:

```bash
TARGET_ETH=2 DEADLINE_SECONDS=86400 METADATA_ID=school-fund \
npm run campaign:create -- --network localhost
```

Ví dụ donate 0.25 ETH cho campaign số 1:

```bash
CAMPAIGN_ID=1 DONATION_ETH=0.25 \
npm run campaign:donate -- --network localhost
```

Để dùng account khác, thêm `ACCOUNT_INDEX`. Account phải có đúng quyền trong contract; ví dụ close campaign chỉ thành công với creator.

## Kiểm tra số ETH

Lệnh sau in số dư của mọi account do Hardhat Node tạo, số ETH contract đang giữ và thông tin campaign số 0:

```bash
npm run balances -- --network localhost
```

Để kiểm tra campaign khác, đặt `CAMPAIGN_ID` trước lệnh:

```bash
CAMPAIGN_ID=1 npm run balances -- --network localhost
```

Sau khi withdraw, `totalRaisedEth` vẫn thể hiện tổng tiền từng quyên góp, còn balance của contract sẽ giảm vì ETH đã được chuyển sang beneficiary.
