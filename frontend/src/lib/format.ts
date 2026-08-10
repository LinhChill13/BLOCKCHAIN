import { formatEther } from "viem";

export function shortAddress(address?: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Chưa kết nối";
}

export function eth(value: bigint) {
  const number = Number(formatEther(value));
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(number);
}

export function dateTime(timestamp: bigint) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(Number(timestamp) * 1000));
}
