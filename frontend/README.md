# CrowdfundChain frontend

Next.js frontend cho contract `Crowdfunding` trên Ethereum Sepolia. Dùng Next.js, TypeScript, Tailwind CSS, wagmi và viem.

Giao diện tự nhận quyền của ví kết nối: donor quyên góp, tổ chức tạo/đóng campaign và chỉ định verifier, beneficiary tạo yêu cầu giải ngân với `amount` + `evidenceHash`, và verifier của campaign duyệt hoặc từ chối request. Beneficiary chỉ nhìn thấy nút rút khi request đã được verifier duyệt và có thể hủy request còn `Pending`.

## Chạy local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Sửa hai biến trong `.env.local`:

- `NEXT_PUBLIC_CROWDFUNDING_ADDRESS`: địa chỉ contract đã deploy trên Sepolia.
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`: Alchemy HTTPS endpoint cho Sepolia.

Mở `http://localhost:3000`, kết nối MetaMask và chuyển sang Sepolia.

## Luồng evidence

`evidenceHash` là `bytes32`, gồm `0x` và 64 ký tự hex. Hãy tạo hash từ hồ sơ công khai, ví dụ hash của CID IPFS, rồi lưu CID/nội dung chứng từ ở IPFS. Contract và event lưu hash để mọi người đối chiếu chứng từ mà không thể thay đổi dấu vết giải ngân.

Verifier được tổ chức chỉ định trong form tạo campaign. Địa chỉ này được lưu on-chain cùng campaign và không thể đổi sau đó; campaign khác có thể dùng verifier khác.

## Lưu ý bảo mật

- Không bao giờ thêm private key vào frontend hoặc biến `NEXT_PUBLIC_*`.
- RPC endpoint là public client configuration; giới hạn allowed origins trong Alchemy Dashboard.
- Contract chỉ lưu `metadataId` và `evidenceHash`; tên dài, mô tả, ảnh và bản chứng từ cần dùng IPFS hoặc database công khai.
