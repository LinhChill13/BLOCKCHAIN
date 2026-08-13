# Slither security-scan evidence

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

1. **Timestamp dependence** — `createCampaign`, dòng 117

   `deadline > block.timestamp` được dùng để kiểm tra deadline trong tương lai.

2. **Timestamp dependence** — `donate`, dòng 148

   `block.timestamp <= campaign.deadline` được dùng để kiểm tra campaign còn hạn nhận quyên góp.

3. **Low-level call** — `withdraw`, dòng 258

   Contract chuyển ETH bằng `campaign.beneficiary.call{value: request.amount}("")`.

## Đánh giá ban đầu

- Hai cảnh báo timestamp xuất phát từ chức năng deadline. Block timestamp có thể bị validator điều chỉnh nhẹ, vì vậy không nên dùng nó cho logic yêu cầu độ chính xác tuyệt đối. Với deadline của campaign, đây là một rủi ro cần được chấp nhận hoặc nêu rõ trong tài liệu, không tự động là lỗ hổng.
- Low-level call là cách phù hợp để chuyển ETH đến beneficiary. Hàm `withdraw` đã cập nhật trạng thái trước khi gọi ra ngoài và có `nonReentrant`, giúp giảm rủi ro reentrancy. Cảnh báo vẫn cần được giữ lại làm bằng chứng kiểm tra bảo mật.

> Mã thoát 255 của Slither có nghĩa là tool tìm thấy cảnh báo; không đồng nghĩa quá trình quét thất bại.
# On-chain evidence — Sepolia

- Network: Sepolia Testnet
- Chain ID: 11155111
- Contract address: `0xBEcE6BC5d46A7C1BC37859A49c2994eb2274fcD6`
- Deployment transaction:
  https://sepolia.etherscan.io/address/0xbece6bc5d46a7c1bc37859a49c2994eb2274fcd6

## Happy path: donation and verified disbursement

| Step | Actor | Action | Transaction | Verified result |
|---|---|---|---|---|
| 1 | Creator | Create campaign | [0x75e596a6acdfd8262f5606385bf8a1ec5032cf3927291fee42773cee583dd822](https://sepolia.etherscan.io/tx/0x75e596a6acdfd8262f5606385bf8a1ec5032cf3927291fee42773cee583dd822) | `CampaignCreated`, campaign ID = 0 |
| 2 | Donor | Donate 0.001001 ETH | [0xab74f12ba6b17db2d5f98d58c52052f133645fb9302df69653dd6bb54579e3f5](https://sepolia.etherscan.io/tx/0xab74f12ba6b17db2d5f98d58c52052f133645fb9302df69653dd6bb54579e3f5) | `DonationReceived`; `totalRaised` increased |
| 3 | Beneficiary | Create disbursement request | [0x0960c14b11820b9f982bdccb73613344f7da5af7ecdee15e6767cc9baeb69f77](https://sepolia.etherscan.io/tx/0x0960c14b11820b9f982bdccb73613344f7da5af7ecdee15e6767cc9baeb69f77) | Request status = `Pending` |
| 4 | Verifier | Approve request | [0xc1b72e47e56476b2922d4d8ed263d3617f3c9c575c7a7852051b43f48d0a9687](https://sepolia.etherscan.io/tx/0xc1b72e47e56476b2922d4d8ed263d3617f3c9c575c7a7852051b43f48d0a9687) | Request status = `Approved` |
| 5 | Beneficiary | Withdraw approved amount | [0xe17962d4c8dc27a9936984b40437477cc1eb153bf68c11da908861817809d900](https://sepolia.etherscan.io/tx/0xe17962d4c8dc27a9936984b40437477cc1eb153bf68c11da908861817809d900#eventlog) | `FundsWithDraw`; beneficiary received ETH |

## Blocked action

- Actor: Donor
- Attempted action: call `withdraw(...)`
- Expected result: reverted because only the campaign beneficiary can withdraw an approved request.
- Evidence: screenshot `evidence/blocked-withdraw.png` and unit-test output in `report-test.txt`.

## UI-to-chain mapping

- “Tạo chiến dịch” → `createCampaign`
- “Ủng hộ” → `donate`
- “Tạo yêu cầu giải ngân” → `createDisbursement`
- “Duyệt yêu cầu” → `approveDisbursementRequest`
- “Rút tiền” → `withdraw`
