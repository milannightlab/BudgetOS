export type TimelinePayment = {
  id: string;
  title: string;
  amount: string;
  date: string;
  type: "income" | "expense";
  status: "actual" | "planned";
  itemId: string | null;
  itemColor: string | null;
  category: { name: string; color: string };
};

export type TimelineEvent = {
  id: string;
  title: string;
  eventDate: string;
  type: "deadline" | "event" | "reminder";
};

export type TimelinePeriodData = {
  payments: TimelinePayment[];
  events: TimelineEvent[];
};
