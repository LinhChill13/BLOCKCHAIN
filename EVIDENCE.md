# Evidence — security scan and deployment status

> **V2 has not yet been deployed to Sepolia.** Add on-chain evidence only after V2 is deployed and verified: deployment, evidence upload, request creation, approval, and withdrawal.

## Phạm vi quét

- Contract: `SMARTCONTRACT/Smartcontract.sol`
- Công cụ: Slither 0.11.6
- Solidity compiler: `solc 0.8.24`
- Kết quả đầy đủ: [`report.txt`](report.txt)

## Lệnh đã dùng

```bash
slither SMARTCONTRACT/Smartcontract.sol \
  --solc "$VIRTUAL_ENV/.solc-select/artifacts/solc-0.8.24/solc-0.8.24" \
  > report.txt 2>&1
```

## Cảnh báo Slither

Slither phân tích 1 contract với 102 detector và trả về 3 kết quả:

1. **Timestamp dependence** — `createCampaign`, dòng 119

   `deadline > block.timestamp` được dùng để kiểm tra deadline trong tương lai.

2. **Timestamp dependence** — `donate`, dòng 150

   `block.timestamp <= campaign.deadline` được dùng để kiểm tra campaign còn hạn nhận quyên góp.

3. **Low-level call** — `withdraw`, dòng 271

   Contract chuyển ETH bằng `campaign.beneficiary.call{value: request.amount}("")`.

## Đánh giá ban đầu

- Hai cảnh báo timestamp xuất phát từ chức năng deadline. Block timestamp có thể bị validator điều chỉnh nhẹ, vì vậy không nên dùng nó cho logic yêu cầu độ chính xác tuyệt đối. Với deadline của campaign, đây là một rủi ro cần được chấp nhận hoặc nêu rõ trong tài liệu, không tự động là lỗ hổng.
- Low-level call là cách phù hợp để chuyển ETH đến beneficiary. Hàm `withdraw` đã cập nhật trạng thái trước khi gọi ra ngoài và có `nonReentrant`, giúp giảm rủi ro reentrancy. Cảnh báo vẫn cần được giữ lại làm bằng chứng kiểm tra bảo mật.

> Mã thoát 255 của Slither có nghĩa là tool tìm thấy cảnh báo; không đồng nghĩa quá trình quét thất bại.

## V2 local verification

- Unit tests: [`report-test.txt`](report-test.txt) — 13/13 passing.
- Relevant V2 checks include a required non-empty `evidenceCid` and `keccak256(bytes(evidenceCid)) == evidenceHash` in `createDisbursementRequest`.
- These local results do not replace on-chain V2 evidence.

## Bảng evidence on-chain — V2

> Điền các liên kết giao dịch sau khi V2 được deploy lên Sepolia. Không dùng dữ liệu từ V1.

| Bước | Actor | Hành động | Giao dịch | Kết quả cần xác minh | Trạng thái |
|---|---|---|---|---|---|
| 1 | Deployer | Deploy và verify V2 | Chưa có | Địa chỉ contract, bytecode/source đã verify | Chờ deploy |
| 2 | Creator | `createCampaign` | Chưa có | `CampaignCreated`, campaign ID và các role | Chờ giao dịch |
| 3 | Donor | `donate` | Chưa có | `DonationReceived`, `totalRaised` tăng | Chờ giao dịch |
| 4 | Beneficiary | Upload chứng từ, rồi gọi `createDisbursementRequest` | Chưa có | `DisbursementRequested`, CID và hash được lưu on-chain | Chờ giao dịch |
| 5 | Verifier | `approveDisbursement` | Chưa có | `DisbursementApproved`, request chuyển sang `Approved` | Chờ giao dịch |
| 6 | Beneficiary | `withdraw` | Chưa có | `FundsWithdrawn`, request chuyển sang `Withdrawn` và beneficiary nhận ETH | Chờ giao dịch |

## Thuộc tính on-chain và off-chain

| Thuộc tính | Lưu trữ / xử lý | Cách kiểm chứng |
|---|---|---|
| Địa chỉ creator, beneficiary, verifier | On-chain | Đọc `getCampaign`; contract kiểm tra đúng quyền khi gọi các hàm tương ứng. |
| Campaign ID, target, deadline, tổng tiền nhận/rút và trạng thái campaign | On-chain | Đọc `getCampaign` và đối chiếu event giao dịch. |
| Khoản donate, request giải ngân, trạng thái duyệt/rút | On-chain | Đọc request, event (`DonationReceived`, `DisbursementRequested`, `DisbursementApproved`, `FundsWithdrawn`) và transaction receipt. |
| `metadataId` của campaign | On-chain | Đọc `getCampaign`; đây chỉ là nhãn/tham chiếu ngắn, không phải toàn bộ metadata. |
| `evidenceCid` và `evidenceHash` | On-chain | Contract yêu cầu CID không rỗng và `evidenceHash == keccak256(bytes(evidenceCid))`. |
| File chứng từ (PDF, PNG, JPG) | Off-chain: IPFS | Mở CID qua IPFS gateway; cần kiểm tra nội dung file ngoài blockchain. |
| Mô tả dài, ảnh và metadata đầy đủ của campaign | Off-chain: IPFS hoặc database | Dùng `metadataId` để liên kết/tra cứu metadata đã công bố. |
| Giao diện, lựa chọn file và quá trình upload | Off-chain: frontend/API Pinata | Kiểm tra UI, phản hồi upload và CID được trả về trước khi gửi transaction. |

> Contract chỉ ràng buộc hash của **chuỗi CID**; việc đánh giá nội dung chứng từ và mức độ hợp lệ của nó vẫn là trách nhiệm off-chain của verifier.

## V2 blocked action (local test)

- Actor: Donor
- Attempted action: call `withdraw(...)`
- Expected result: reverted because only the campaign beneficiary can withdraw an approved request.
- Evidence: TC-10 in [`report-test.txt`](report-test.txt) verifies this revert. No on-chain V2 transaction or screenshot is currently recorded.

## UI-to-chain mapping

- “Tạo chiến dịch” → `createCampaign`
- “Ủng hộ” → `donate`
- “Tạo yêu cầu giải ngân” → `createDisbursementRequest`
- “Duyệt yêu cầu” → `approveDisbursement`
- “Rút tiền” → `withdraw`
