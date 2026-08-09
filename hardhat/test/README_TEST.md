# Kế hoạch kiểm thử Crowdfunding

## Cách chạy

Từ thư mục `hardhat/`:

```bash
npm test
```

Trước khi test, script tự đồng bộ `../SMARTCONTRACT/Smartcontract.sol` vào `contracts/Crowdfunding.sol`. Test chạy trên Hardhat Network cục bộ, không dùng ETH thật.

## Quy ước kiểm thử

- `creator`: ví tạo campaign.
- `beneficiary`: ví nhận tiền rút từ campaign.
- `donor`: ví gửi ETH quyên góp.
- `stranger`: ví không có quyền quản trị hoặc rút campaign.
- `targetAmount`: 1 ETH.
- `donation`: 0.1 ETH.
- `deadline`: 1 giờ sau block hiện tại, trừ test deadline quá khứ.

## Danh sách test case

| ID | Chức năng | Thao tác | Kỳ vọng |
| --- | --- | --- | --- |
| TC-01 | Tạo campaign | Gọi `createCampaign()` với beneficiary hợp lệ, target > 0, deadline tương lai | Tạo campaign, `campaignCount` tăng, toàn bộ dữ liệu và `metadataId` được lưu; phát `CampaignCreated`. |
| TC-02 | Beneficiary rỗng | Gọi `createCampaign(address(0), ...)` | Revert: `Invalid beneficiary`. |
| TC-03 | Target không hợp lệ | Gọi `createCampaign()` với `targetAmount = 0` | Revert: `Target must be greater than zero`. |
| TC-04 | Deadline quá khứ | Gọi `createCampaign()` với deadline nhỏ hơn thời gian block hiện tại | Revert: `Deadline must be in the future`. |
| TC-05 | Donate hợp lệ | Donor gọi `donate()` cùng 0.1 ETH | `totalRaised` và `getDonation()` tăng 0.1 ETH; phát `DonationReceived`. |
| TC-06 | Donate bằng 0 | Donor gọi `donate()` với `msg.value = 0` | Revert: `Donation must be greater than zero`. |
| TC-07 | Donate campaign đóng | Creator đóng campaign, donor gọi `donate()` | Revert: `Campaign is closed`. |
| TC-08 | Donate quá deadline | Đặt timestamp block kế tiếp vượt deadline, donor gọi `donate()` | Revert: `Campaign deadline passed`. |
| TC-09 | Đóng campaign | Creator gọi `closeCampaign()` | Status chuyển `Active` sang `Closed`; phát `CampaignClosed`. |
| TC-10 | Đóng sai quyền | Stranger gọi `closeCampaign()` | Revert: `Only creator can close campaign`. |
| TC-11 | Rút tiền hợp lệ | Donor donate, creator đóng campaign, beneficiary gọi `withdraw()` | Beneficiary nhận ETH, `withdrawn = true`; phát `FundsWithdrawn`. |
| TC-12 | Rút tiền sai quyền | Stranger gọi `withdraw()` sau khi campaign đóng có tiền | Revert: `Only beneficiary can withdraw`. |
| TC-13 | Rút hai lần | Beneficiary rút thành công rồi gọi lại `withdraw()` | Revert: `Funds already withdrawn`. |
| TC-14 | Rút khi chưa kết thúc | Beneficiary gọi `withdraw()` khi campaign vẫn `Active` và chưa tới deadline | Revert: `Campaign is still active`. |

## Ghi chú

- TC-08 sử dụng RPC `evm_setNextBlockTimestamp` của Hardhat Network để mô phỏng thời gian vượt deadline.
- TC-11 kiểm tra số dư beneficiary tăng sau rút. Số dư tăng không được so sánh bằng chính xác 0.1 ETH vì beneficiary là người gửi transaction `withdraw()` và phải trả gas.
- Mỗi test triển khai contract mới để các test không ảnh hưởng trạng thái lẫn nhau.
