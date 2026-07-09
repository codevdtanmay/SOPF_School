import React, { useEffect, useState } from "react";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import { Transport } from "../types/transport.types";

interface Props {
  isOpen: boolean;
  transport: Transport | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: {
    month: string;
    year: number;
    amount: number;
    paymentMethod: string;
    remarks: string;
  }) => void;
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CollectTransportFeeModal: React.FC<Props> = ({
  isOpen,
  transport,
  loading = false,
  onClose,
  onSubmit,
}) => {
  const today = new Date();

  const [month, setMonth] = useState(months[today.getMonth()]);
  const [year, setYear] = useState(today.getFullYear());
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (!transport || !isOpen) {
      return;
    }

    setMonth(months[today.getMonth()]);
    setYear(today.getFullYear());
    setAmount(transport.monthlyCharge);
    setPaymentMethod("Cash");
    setRemarks("");
  }, [isOpen, transport]);

  if (!isOpen || !transport) return null;

  const submit = () => {
    onSubmit({
      month,
      year,
      amount,
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
            Amount
          </label>

          <input
            type="number"
            className="w-full border rounded-lg p-2 mt-1"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
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
