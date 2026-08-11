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
| 1 | Creator | Create campaign | [tx](https://sepolia.etherscan.io/tx/0x...) | `CampaignCreated`, campaign ID = 0 |
| 2 | Donor | Donate 0.01 ETH | [tx](https://sepolia.etherscan.io/tx/0x...) | `DonationReceived`; `totalRaised` increased |
| 3 | Beneficiary | Create disbursement request | [tx](https://sepolia.etherscan.io/tx/0x...) | Request status = `Pending` |
| 4 | Verifier | Approve request | [tx](https://sepolia.etherscan.io/tx/0x...) | Request status = `Approved` |
| 5 | Beneficiary | Withdraw approved amount | [tx](https://sepolia.etherscan.io/tx/0x...) | `WithdrawalCompleted`; beneficiary received ETH |

## Blocked action

- Actor: Donor
- Attempted action: call `withdraw(...)`
- Expected result: reverted because only the campaign beneficiary can withdraw an approved request.
- Evidence: screenshot `evidence/blocked-withdraw.png` and unit-test output in `report-test.txt`.

## UI-to-chain mapping

- “Tạo chiến dịch” → `createCampaign`
- “Ủng hộ” → `donate`
- “Tạo yêu cầu giải ngân” → `createDisbursementRequest`
- “Duyệt yêu cầu” → `approveDisbursementRequest`
- “Rút tiền” → `withdraw`