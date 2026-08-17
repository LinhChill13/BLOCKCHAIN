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

- Unit tests: [`report-test.txt`](report-test.txt) — 16/16 passing, including the local security scenarios below.
- Relevant V2 checks include a required non-empty `evidenceCid` and `keccak256(bytes(evidenceCid)) == evidenceHash` in `createDisbursementRequest`.
- These local results do not replace on-chain V2 evidence.

## Kiểm thử bảo mật bổ sung (Hardhat local)

- TC-14: Không thể gọi `withdraw()` lần hai cho cùng request; lời gọi thứ hai revert với `Request is not active`.
- TC-15: `ReentrancyAttacker` đã thử re-enter khi nhận ETH; lời gọi lồng bị chặn, lời gọi ngoài chỉ rút đúng một lần.
- TC-16: `RejectingBeneficiary` từ chối nhận ETH; toàn bộ giao dịch withdraw rollback và request vẫn `Approved`.
- Invariant: các luồng donate và withdraw kiểm tra `totalWithdrawn <= totalRaised`; với fixture một campaign, số dư contract cũng luôn bằng `totalRaised - totalWithdrawn`.

## Bảng evidence on-chain — V2

Contract address: 0x57d9A07100CeF698EE29c22d8aFB780de45F252A

| Bước | Actor | Hành động | Giao dịch | Kết quả cần xác minh |
|---|---|---|---|---|
| 1 | Deployer | Deploy và verify V2 | https://sepolia.etherscan.io/tx/0x0bbd55adfd3004c3793ea1ab2354babc5082f885c6566f12ecd8182385bda849  | Địa chỉ contract, bytecode/source đã verify | 
| 2 | Creator | `createCampaign` | https://sepolia.etherscan.io/tx/0x0bbd55adfd3004c3793ea1ab2354babc5082f885c6566f12ecd8182385bda849 | `CampaignCreated`, campaign ID và các role | 
| 3 | Donor | `donate` | https://sepolia.etherscan.io/tx/0x55882d8f8aae3c82df91c5d49a0a29cc597ee696351da7bb3634077e2cb71df7 | `DonationReceived`, `totalRaised` tăng | Chờ giao dịch |
| 4 | Beneficiary | Upload chứng từ, rồi gọi `createDisbursementRequest` | https://sepolia.etherscan.io/tx/0x36ab2040066cec4c89539635f4e09965375b42117b2d3ccc4598bf790a730fa3 | `DisbursementRequested`, CID và hash được lưu on-chain | 
| 5 | Verifier | `approveDisbursement` | https://sepolia.etherscan.io/tx/0x5a4040a313f3f92cde68ac5610c41d8f7a38ee4f4452724346ed9dac35afbe33 | `DisbursementApproved`, request chuyển sang `Approved` | 
| 6 | Beneficiary | `withdraw` | https://sepolia.etherscan.io/tx/0x36ac03482d6bf8dcb7ba7f9923b9b5c3376e47be6c3ac11d912845270d8eedad | `FundsWithdrawn`, request chuyển sang `Withdrawn` và beneficiary nhận ETH | 

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
