import { useState, useEffect, useCallback } from "react";

import { transportApi } from "../api/transportApi";

import {
  Transport,
  TransportPayment,
  TransportDashboard,
  PendingTransportStudent
} from "../types/transport.types";

export const useTransport = () => {

  const [loading, setLoading] = useState(true);

  const [transports, setTransports] =
    useState<Transport[]>([]);

  const [payments, setPayments] =
    useState<TransportPayment[]>([]);

  const [dashboard, setDashboard] =
    useState<TransportDashboard | null>(null);

  const [pendingStudents, setPendingStudents] =
    useState<PendingTransportStudent[]>([]);

  const loadData = useCallback(async () => {

    try {

      setLoading(true);

      const [
        transportData,
        paymentData,
        dashboardData,
        pendingData
      ] = await Promise.all([

        transportApi.getStudents(),

        transportApi.getHistory(),

        transportApi.getDashboard(),

        transportApi.getPending()

      ]);

      setTransports(transportData);

      setPayments(paymentData);

      setDashboard(dashboardData);

      setPendingStudents(pendingData);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => {

    loadData();

  }, [loadData]);

  //-------------------------
  // CRUD
  //-------------------------

  const addTransport = async (data: any) => {

    const newTransport =
      await transportApi.addStudent(data);

    setTransports(prev => [
      ...prev,
      newTransport
    ]);

    return newTransport;

  };

  const updateTransport = async (
    id: string,
    data: any
  ) => {

    const updated =
      await transportApi.updateStudent(
        id,
        data
      );

    setTransports(prev =>
      prev.map(t =>
        t.id === id
          ? updated
          : t
      )
    );

    return updated;

  };

  const deleteTransport = async (
    id: string
  ) => {

    await transportApi.deleteStudent(id);

    setTransports(prev =>
      prev.filter(
        t => t.id !== id
      )
    );

  };

  //-------------------------
  // Collect Fee
  //-------------------------

  const collectFee = async (
    data: any
  ) => {

    const payment =
      await transportApi.collectFee(data);

    setPayments(prev => [
      payment,
      ...prev
    ]);

    await loadData();

    return payment;

  };

  //-------------------------
  // Reports
  //-------------------------

  const getMonthlyReport =
    async (
      month: string,
      year: string
    ) => {

      return transportApi.getMonthlyReport(
        month,
        year
      );

    };

  return {

    loading,

    transports,

    payments,

    dashboard,

    pendingStudents,

    refresh: loadData,

    addTransport,

    updateTransport,

    deleteTransport,

    collectFee,

    getMonthlyReport

  };

};