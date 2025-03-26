// src/app/signin/page.tsx
"use client";

import React from "react";
import SignIn from "@/components/SignIn";

const SignInPage = () => {
  return (
    <SignIn
      onSignInSuccess={() => {
        console.log("Sign-in successful");
      }}
    />
  );
};

export default SignInPage;