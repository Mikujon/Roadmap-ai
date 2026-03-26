import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export const PLANS = {
  FREE: {
    name: "Free",
    projects: 10,
    members: 1,
    price: 0,
  },
  PRO: {
    name: "Pro",
    projects: 30,
    members: 10,
    price: 29,
  },
  BUSINESS: {
    name: "Business",
    projects: -1,
    members: -1,
    price: 99,
  },
};