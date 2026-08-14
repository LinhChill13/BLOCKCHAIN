# Evidence — security scan and deployment status

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

| Bước | Actor | Hành động | Giao dịch | Kết quả cần xác minh |
|---|---|---|---|---|
| 1 | Deployer | Deploy và verify V2 | 0xfd20cc10856c3452020b55ea1dea05e6aec10fb8e51d15cccce9f938d7ae0fe7  | Địa chỉ contract, bytecode/source đã verify | 
| 2 | Creator | `createCampaign` | 0x0bbd55adfd3004c3793ea1ab2354babc5082f885c6566f12ecd8182385bda849 | `CampaignCreated`, campaign ID và các role | 
| 3 | Donor | `donate` | 0x55882d8f8aae3c82df91c5d49a0a29cc597ee696351da7bb3634077e2cb71df7 | `DonationReceived`, `totalRaised` tăng | Chờ giao dịch |
| 4 | Beneficiary | Upload chứng từ, rồi gọi `createDisbursementRequest` | 0x1e26669cfd5743b12972f079d4c1c2b0acc624d54173a7977dc098fefeb3ec71 | `DisbursementRequested`, CID và hash được lưu on-chain | 
| 5 | Verifier | `approveDisbursement` | 0x36ab2040066cec4c89539635f4e09965375b42117b2d3ccc4598bf790a730fa3 | `DisbursementApproved`, request chuyển sang `Approved` | 
| 6 | Beneficiary | `withdraw` | 0x36ac03482d6bf8dcb7ba7f9923b9b5c3376e47be6c3ac11d912845270d8eedad | `FundsWithdrawn`, request chuyển sang `Withdrawn` và beneficiary nhận ETH | 

## Thuộc tính on-chain và off-chain

| On-chain | Off-chain |
|---|---|
| `campaignId` | File chứng từ |
| `creator` | Nội dung chứng từ |
| `beneficiary` | |
| `verifier` | |
| `targetAmount` | |
| `deadline` | |
| `totalRaised` | |
| `totalWithdrawn` | |
| `status` | |
| `metadataId` | |
| `donations` | |
| `evidenceCid` | |
| `evidenceHash` | |
| `disbursementRequests` | |

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
