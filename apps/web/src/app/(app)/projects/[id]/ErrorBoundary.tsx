"use client";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error(`[ErrorBoundary:${this.props.name}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: "24px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, margin: "12px 0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: 6 }}>
            ⚠ Something went wrong in {this.props.name ?? "this section"}
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{ fontSize: 12, fontWeight: 600, color: "#DC2626", background: "#fff", border: "1px solid #FECACA", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}