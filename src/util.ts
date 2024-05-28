export const sleep = async (time: number) =>
   new Promise((resolve) => setTimeout(resolve, time));

export const parseDate = (date: string) => {
   // Ensure the date string is in the format YYYY-MM-DD
   const dateParts = date.split("-");

   const year = parseInt(dateParts[0], 10);
   const month = parseInt(dateParts[1], 10) - 1; // Months are zero-based in JavaScript Date
   const day = parseInt(dateParts[2], 10);

   return new Date(year, month, day);
};

export const formatDate = (date: Date) => {
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based, so add 1 and pad with leading zero if necessary
   const day = String(date.getDate()).padStart(2, "0"); // Pad with leading zero if necessary

   return `${year}-${month}-${day}`;
};
