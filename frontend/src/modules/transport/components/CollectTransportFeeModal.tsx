import React, { useEffect, useState } from "react";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import { Transport } from "../types/transport.types";
import {
  TRANSPORT_BILLING_MONTHS,
  getCurrentTransportBillingMonth
} from "../utils/transportCalendar";

interface Props {
  isOpen: boolean;
  transport: Transport | null;
  initialMonth?: string;
  initialYear?: string;
  initialAmount?: number;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: {
    month: string;
    year: number;
    paidAmount: number;
    paymentMethod: string;
    remarks: string;
  }) => void;
}

const months = TRANSPORT_BILLING_MONTHS;

const CollectTransportFeeModal: React.FC<Props> = ({
  isOpen,
  transport,
  initialMonth,
  initialYear,
  initialAmount,
  loading = false,
  onClose,
  onSubmit,
}) => {
  const defaultMonth = initialMonth && months.includes(initialMonth)
    ? initialMonth
    : getCurrentTransportBillingMonth();
  const defaultYear = initialYear ? Number(initialYear) : new Date().getFullYear();

  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const isPartialPayment = initialAmount != null && transport?.paymentStatus === "Partial";

  useEffect(() => {
    if (!transport || !isOpen) {
      return;
    }

    const defaultAmount =
      initialAmount != null && initialAmount > 0
        ? initialAmount
        : transport.paymentStatus === "Partial" &&
          transport.dueAmount != null &&
          transport.dueAmount > 0
          ? transport.dueAmount
          : transport.monthlyCharge;

    setMonth(defaultMonth);
    setYear(defaultYear);
    setPaidAmount(defaultAmount);
    setPaymentMethod("Cash");
    setRemarks("");
  }, [defaultMonth, defaultYear, initialAmount, isOpen, transport]);

  if (!isOpen || !transport) return null;

  const submit = () => {
    onSubmit({
      month,
      year,
      paidAmount,
      paymentMethod,
      remarks,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Collect Transport Fee"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Collecting..." : "Collect Fee"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="space-y-1">
          <div className="font-semibold text-slate-900">{transport.name}</div>
          <div className="text-sm text-slate-500">
            {transport.admissionNo}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold">
            Month
          </label>

          <select
            className="w-full border rounded-lg p-2 mt-1"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {months.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold">
            Year
          </label>

          <input
            type="number"
            className="w-full border rounded-lg p-2 mt-1"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm font-semibold">
            Paid Amount
          </label>

          <input
            type="number"
            className="w-full border rounded-lg p-2 mt-1"
            value={paidAmount}
            onChange={(e) => setPaidAmount(Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-slate-500">
            {isPartialPayment ? 'Remaining Fee' : 'Monthly Charge'}: ₹{isPartialPayment ? initialAmount : transport.monthlyCharge}
          </p>
          {transport.paymentStatus === "Partial" && transport.dueAmount != null && transport.dueAmount > 0 && (
            <p className="mt-1 text-xs font-semibold text-amber-600">
              Current Due Amount: ₹{transport.dueAmount}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold">
            Payment Method
          </label>

          <select
            className="w-full border rounded-lg p-2 mt-1"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option>Cash</option>
            <option>UPI</option>
            <option>Card</option>
            <option>Bank Transfer</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold">
            Remarks
          </label>

          <textarea
            className="w-full border rounded-lg p-2 mt-1"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default CollectTransportFeeModal;
