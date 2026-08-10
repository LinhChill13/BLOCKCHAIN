# Charity DApp — giải ngân có kiểm toán on-chain

Charity DApp là ứng dụng gây quỹ trên EVM, trong đó ETH luôn nằm trong smart contract cho tới khi một yêu cầu giải ngân được kiểm tra độc lập. Đây là điểm khác biệt có thể kiểm chứng công khai so với database thông thường: không bên nào tự sửa được số tiền, bằng chứng, người duyệt hay lịch sử chuyển tiền.

## Luồng trọng tâm

1. **Tổ chức** tạo campaign, chỉ định **beneficiary**, **verifier** độc lập, mục tiêu và thời hạn.
2. **Donor** gửi ETH; tổng đóng góp và từng khoản đóng góp được ghi on-chain.
3. **Beneficiary** tạo yêu cầu giải ngân gồm `amount` và `evidenceHash` (hash `bytes32` của hồ sơ/bằng chứng, ví dụ hash CID IPFS).
4. **Verifier của campaign** — ví được công bố và khóa ngay khi campaign được tạo — duyệt chính yêu cầu đó on-chain.
5. Chỉ sau khi duyệt, **beneficiary** mới có thể rút đúng `amount` đã yêu cầu. Contract phát event cho cả tạo yêu cầu, duyệt và rút tiền.

Mỗi campaign chỉ có một yêu cầu đang chờ duyệt/đang chờ rút tại một thời điểm. Sau khi rút, beneficiary có thể tạo yêu cầu kế tiếp trong phần tiền chưa giải ngân. Mỗi campaign có verifier riêng, phải khác beneficiary và tổ chức tạo campaign, nhưng verifier không thể đổi sau khi đã tạo nên donor luôn biết ai kiểm tra dòng tiền trước khi quyên góp. Lịch sử các request cũ vẫn được lưu trong contract và event log.

## Thành phần

- [`SMARTCONTRACT/Smartcontract.sol`](SMARTCONTRACT/Smartcontract.sol): nguồn contract chính.
- [`hardhat`](hardhat): biên dịch, test, deploy và script minh hoạ đủ luồng 3 vai trò.
- [`frontend`](frontend): Next.js UI đọc contract Sepolia, tạo/duyệt/rút request theo quyền của ví đang kết nối.

## Chạy nhanh

```bash
cd hardhat
npm install
npm test

cd ../frontend
npm install
npm run dev
```

Xem README trong từng thư mục để deploy và cấu hình biến môi trường.
