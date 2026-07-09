const computeInstallmentDetails = (
  cumulativePaid,
  structure
) => {

  const J = structure.juneAmount || 0;
  const S = structure.septemberAmount || 0;
  const D = structure.decemberAmount || 0;
  const M = structure.marchAmount || 0;

  let temp = cumulativePaid;

  const junePaid = Math.min(temp, J);
  temp = Math.max(0, temp - J);

  const septPaid = Math.min(temp, S);
  temp = Math.max(0, temp - S);

  const decPaid = Math.min(temp, D);
  temp = Math.max(0, temp - D);

  const marchPaid = Math.min(temp, M);

  return {
    june: {
      target: J,
      paid: junePaid,
      remaining: J - junePaid,
      status:
        junePaid >= J
          ? "Paid"
          : junePaid > 0
          ? "Partial"
          : "Pending"
    },

    september: {
      target: S,
      paid: septPaid,
      remaining: S - septPaid,
      status:
        septPaid >= S
          ? "Paid"
          : septPaid > 0
          ? "Partial"
          : "Pending"
    },

    december: {
      target: D,
      paid: decPaid,
      remaining: D - decPaid,
      status:
        decPaid >= D
          ? "Paid"
          : decPaid > 0
          ? "Partial"
          : "Pending"
    },

    march: {
      target: M,
      paid: marchPaid,
      remaining: M - marchPaid,
      status:
        marchPaid >= M
          ? "Paid"
          : marchPaid > 0
          ? "Partial"
          : "Pending"
    }
  };
};

export default computeInstallmentDetails;