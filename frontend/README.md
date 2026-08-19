# CrowdfundChain frontend

Next.js frontend cho contract `Crowdfunding` trên Ethereum Sepolia. Dùng Next.js, TypeScript, Tailwind CSS, wagmi và viem.

Giao diện tự nhận quyền của ví kết nối: donor quyên góp, tổ chức tạo/đóng campaign và chỉ định verifier, beneficiary tạo yêu cầu giải ngân với `amount` + `evidenceHash`, và verifier của campaign duyệt hoặc từ chối request. Beneficiary chỉ nhìn thấy nút rút khi request đã được verifier duyệt và có thể hủy request còn `Pending`.

## Chạy ứng dụng trên máy local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Sửa các biến trong `.env.local`:

- `NEXT_PUBLIC_CROWDFUNDING_ADDRESS`: địa chỉ contract đã deploy trên Sepolia.
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`: Alchemy HTTPS endpoint cho Sepolia.
- `NEXT_PUBLIC_IPFS_GATEWAY`: gateway để mở file evidence từ CID, mặc định ví dụ `https://ipfs.io/ipfs`.
- `PINATA_JWT`: JWT server-only của Pinata để tạo URL upload tạm thời. Không đặt tiền tố `NEXT_PUBLIC_` và không commit JWT.
- `UPSTASH_REDIS_REST_URL`: REST URL của database Upstash Redis, chỉ dùng ở server.
- `UPSTASH_REDIS_REST_TOKEN`: REST token tương ứng của Upstash Redis, chỉ dùng ở server.

Mở `http://localhost:3000`, kết nối MetaMask và chuyển sang Sepolia. “Chạy local” ở đây chỉ nói đến Next.js chạy trên máy của bạn: frontend hiện cố định chain **Sepolia**, không tự kết nối Hardhat localhost. Các lệnh `--network localhost` trong thư mục `hardhat` chỉ phù hợp nếu bạn cũng chỉnh/cấu hình frontend để dùng chain ID, RPC và địa chỉ contract local.

## Luồng evidence

Beneficiary chọn PDF, PNG hoặc JPG (tối đa 10 MB). Trước khi xin URL upload, ví ký thông điệp gồm origin, campaign ID, địa chỉ ví, nonce UUID, thời điểm cấp/hết hạn và metadata file. API server xác minh chữ ký trên Sepolia, kiểm tra ví ký đúng là beneficiary của campaign, giới hạn tần suất theo IP và ví bằng Upstash, đồng thời ghi nonce dùng một lần vào Redis. Chỉ sau đó server mới dùng `PINATA_JWT` để xin URL upload Pinata có chữ ký (hết hạn sau 60 giây); JWT không được trả về trình duyệt. Frontend upload file trực tiếp tới URL đó, nhận CID và tự tính `evidenceHash = keccak256(bytes(CID))`. MetaMask sau đó ký transaction lưu cả CID và hash vào contract. Verifier có thể mở file IPFS và app hiển thị kết quả CID có khớp hash on-chain hay không.

Tạo Pinata JWT có quyền upload public files, rồi tạo Upstash Redis REST database và sao chép URL/token vào `.env.local` (và Environment Variables trên Vercel). Thiếu một trong ba biến server-only `PINATA_JWT`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` thì API sẽ từ chối cấp URL upload. Chứng từ tải lên IPFS public có thể được xem bởi người biết CID/link; chỉ dùng file demo hoặc đã loại bỏ dữ liệu cá nhân.

Verifier được tổ chức chỉ định trong form tạo campaign. Địa chỉ này được lưu on-chain cùng campaign và không thể đổi sau đó; campaign khác có thể dùng verifier khác.

## Lưu ý bảo mật

- Không bao giờ thêm private key vào frontend hoặc biến `NEXT_PUBLIC_*`.
- RPC endpoint là public client configuration; giới hạn allowed origins trong Alchemy Dashboard.
- Contract lưu `metadataId`, CID IPFS và `evidenceHash`.
