# CrowdfundChain frontend

Next.js frontend cho contract `Crowdfunding` trên Ethereum Sepolia. Dùng Next.js, TypeScript, Tailwind CSS, wagmi và viem.

Giao diện tự nhận quyền của ví kết nối: donor quyên góp, tổ chức tạo/đóng campaign và chỉ định verifier, beneficiary tạo yêu cầu giải ngân với `amount` + `evidenceHash`, và verifier của campaign duyệt hoặc từ chối request. Beneficiary chỉ nhìn thấy nút rút khi request đã được verifier duyệt và có thể hủy request còn `Pending`.

## Chạy local

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

Mở `http://localhost:3000`, kết nối MetaMask và chuyển sang Sepolia.

## Luồng evidence

Beneficiary chọn PDF, PNG hoặc JPG (tối đa 10 MB). Frontend xin URL upload tạm thời từ API server, upload file lên IPFS qua Pinata, nhận CID và tự tính `evidenceHash = keccak256(bytes(CID))`. MetaMask sau đó ký transaction lưu cả CID và hash vào contract. Verifier có thể mở file IPFS và app hiển thị kết quả CID có khớp hash on-chain hay không.

Tạo Pinata JWT có quyền upload public files, lưu vào `PINATA_JWT` trong `.env.local` (và Environment Variables trên Vercel). Chứng từ tải lên IPFS public có thể được xem bởi người biết CID/link; chỉ dùng file demo hoặc đã loại bỏ dữ liệu cá nhân.

Verifier được tổ chức chỉ định trong form tạo campaign. Địa chỉ này được lưu on-chain cùng campaign và không thể đổi sau đó; campaign khác có thể dùng verifier khác.

## Lưu ý bảo mật

- Không bao giờ thêm private key vào frontend hoặc biến `NEXT_PUBLIC_*`.
- RPC endpoint là public client configuration; giới hạn allowed origins trong Alchemy Dashboard.
- Contract lưu `metadataId`, CID IPFS và `evidenceHash`.
