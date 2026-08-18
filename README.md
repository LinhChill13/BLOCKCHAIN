# Charity DApp — giải ngân có kiểm toán on-chain

Charity DApp là ứng dụng gây quỹ trên EVM, trong đó ETH luôn nằm trong smart contract cho tới khi một yêu cầu giải ngân được kiểm tra độc lập. Đây là điểm khác biệt có thể kiểm chứng công khai so với database thông thường: không bên nào tự sửa được số tiền, bằng chứng, người duyệt hay lịch sử chuyển tiền.

## Luồng trọng tâm

1. **Tổ chức** tạo campaign, chỉ định **beneficiary**, **verifier** độc lập, mục tiêu và thời hạn.
2. **Donor** gửi ETH; tổng đóng góp và từng khoản đóng góp được ghi on-chain.
3. **Beneficiary** chọn chứng từ PDF/ảnh; ứng dụng upload lên IPFS, rồi tạo yêu cầu giải ngân gồm `amount`, `evidenceCid` và `evidenceHash = keccak256(bytes(evidenceCid))`.
4. **Verifier của campaign** — ví được công bố và khóa ngay khi campaign được tạo — duyệt chính yêu cầu đó on-chain.
5. Chỉ sau khi duyệt, **beneficiary** mới có thể rút đúng `amount` đã yêu cầu. Contract phát event cho cả tạo yêu cầu, duyệt và rút tiền.

Nếu chứng từ không hợp lệ, verifier có thể **từ chối** request `Pending`. Beneficiary cũng có thể **hủy** request `Pending` nếu tự phát hiện sai sót. Hai thao tác đều ghi event, chuyển request sang trạng thái cuối cùng và giải phóng campaign để tạo request mới.

Mỗi campaign chỉ có một yêu cầu đang chờ duyệt/đang chờ rút tại một thời điểm. Sau khi rút, beneficiary có thể tạo yêu cầu kế tiếp trong phần tiền chưa giải ngân. Mỗi campaign có verifier riêng, phải khác beneficiary và tổ chức tạo campaign, nhưng verifier không thể đổi sau khi đã tạo nên donor luôn biết ai kiểm tra dòng tiền trước khi quyên góp. Lịch sử các request cũ vẫn được lưu trong contract và event log.

## Thành phần

- [`SMARTCONTRACT/Smartcontract.sol`](SMARTCONTRACT/Smartcontract.sol): nguồn contract chính.
- [`hardhat`](hardhat): biên dịch, test, deploy và script minh hoạ đủ luồng 3 vai trò.
- [`frontend`](frontend): Next.js UI đọc contract Sepolia, tạo/duyệt/rút request theo quyền của ví đang kết nối.

## Tái lập môi trường

Yêu cầu chung: Git và Node.js **22 trở lên** (npm đi kèm). Dự án có hai lockfile; dùng `npm ci` để cài đúng phiên bản dependency đã được kiểm thử.

### Linux (Fish)

Ví dụ dưới đây dành cho Ubuntu/Debian. Cài Git, sau đó dùng Volta để cài Node.js mà không phụ thuộc vào phiên bản Node trong kho package của hệ điều hành:

```fish
sudo apt update
sudo apt install -y git curl
curl https://get.volta.sh | bash
fish_add_path $HOME/.volta/bin
volta install node@22

git clone https://github.com/LinhChill13/BLOCKCHAIN.git
cd BLOCKCHAIN/hardhat
npm ci
npm test

cd ../frontend
cp .env.example .env.local
npm ci
npm run dev
```

Nếu mở một cửa sổ Fish mới sau khi cài Volta, chạy lại `fish_add_path $HOME/.volta/bin` nếu lệnh `volta` chưa được nhận diện.

### macOS (Terminal / zsh)

Cài [Homebrew](https://brew.sh/) nếu máy chưa có, rồi chạy:

```bash
brew install git node

git clone https://github.com/LinhChill13/BLOCKCHAIN.git
cd BLOCKCHAIN/hardhat
npm ci
npm test

cd ../frontend
cp .env.example .env.local
npm ci
npm run dev
```

### Windows (PowerShell)

Mở PowerShell **với quyền thường** và cài Git cùng Node.js LTS bằng Winget. Đóng/mở lại PowerShell sau bước cài đặt để cập nhật `PATH`.

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e

git clone https://github.com/LinhChill13/BLOCKCHAIN.git
Set-Location BLOCKCHAIN/hardhat
npm ci
npm test

Set-Location ../frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Sau khi chạy frontend, mở <http://localhost:3000>. Trước khi dùng các chức năng kết nối Sepolia/IPFS, điền các biến cần thiết vào `frontend/.env.local`; xem README trong từng thư mục để deploy và cấu hình đầy đủ.

Kiểm tra nhanh môi trường trên mọi hệ điều hành:

```text
git --version
node --version
npm --version
```

Để có dữ liệu local sẵn sàng cho demo, xem [hướng dẫn seed data](hardhat/scripts/SEED_DATA.md).
