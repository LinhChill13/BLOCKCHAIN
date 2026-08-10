# CrowdfundChain frontend

Next.js frontend cho contract `Crowdfunding` trên Ethereum Sepolia. Dùng Next.js, TypeScript, Tailwind CSS, wagmi và viem.

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

## Lưu ý bảo mật

- Không bao giờ thêm private key vào frontend hoặc biến `NEXT_PUBLIC_*`.
- RPC endpoint là public client configuration; giới hạn allowed origins trong Alchemy Dashboard.
- Contract hiện chỉ lưu `metadataId`. Tên dài, mô tả và ảnh cần dùng IPFS hoặc database để chia sẻ giữa mọi người.
