"use client";

import React from "react";
import { LoginForm, LoginFormPage, ProFormText, ProFormCheckbox, ProFormCaptcha } from "@ant-design/pro-components";
import { Button, Divider, Space, message, Tabs } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: Basic Login Form
const BasicLoginFormDemo = () => (
    <LoginForm
        title="Login"
        subTitle="Welcome back"
        onFinish={async (values) => {
            console.log(values);
            message.success("Login successful!");
            return true;
        }}
    >
        <ProFormText
            name="username"
            fieldProps={{ prefix: "👤" }}
            placeholder="Username"
            rules={[{ required: true }]}
        />
        <ProFormText.Password
            name="password"
            fieldProps={{ prefix: "🔒" }}
            placeholder="Password"
            rules={[{ required: true }]}
        />
        <div style={{ marginBottom: 16 }}>
            <ProFormCheckbox name="remember">Remember me</ProFormCheckbox>
            <a style={{ float: "right" }}>Forgot password?</a>
        </div>
    </LoginForm>
);

// Demo 2: With Logo
const LogoLoginFormDemo = () => (
    <LoginForm
        logo={<div style={{ fontSize: 40 }}>🚀</div>}
        title="MyApp"
        subTitle="Sign in to continue"
        onFinish={async () => {
            message.success("Logged in!");
            return true;
        }}
    >
        <ProFormText name="email" placeholder="Email" rules={[{ required: true }]} />
        <ProFormText.Password name="password" placeholder="Password" rules={[{ required: true }]} />
    </LoginForm>
);

// Demo 3: With Social Login
const SocialLoginFormDemo = () => (
    <LoginForm
        title="Sign In"
        actions={
            <div style={{ textAlign: "center" }}>
                <Divider plain>Or continue with</Divider>
                <Space size="large">
                    <Button shape="circle" size="large">G</Button>
                    <Button shape="circle" size="large">f</Button>
                    <Button shape="circle" size="large">🐦</Button>
                </Space>
            </div>
        }
        onFinish={async () => {
            message.success("Success!");
            return true;
        }}
    >
        <ProFormText name="email" placeholder="Email" />
        <ProFormText.Password name="password" placeholder="Password" />
    </LoginForm>
);

// Demo 4: With Captcha
const CaptchaLoginFormDemo = () => (
    <LoginForm
        title="Verify Login"
        onFinish={async () => {
            message.success("Verified!");
            return true;
        }}
    >
        <ProFormText name="phone" placeholder="Phone Number" rules={[{ required: true }]} />
        <ProFormCaptcha
            name="captcha"
            phoneName="phone"
            placeholder="Verification Code"
            onGetCaptcha={async () => {
                message.success("Code sent!");
            }}
        />
    </LoginForm>
);

// Demo 5: With Tabs
const TabsLoginFormDemo = () => (
    <LoginForm
        title="Account Login"
        onFinish={async () => {
            message.success("Welcome!");
            return true;
        }}
    >
        <Tabs items={[
            {
                key: "account",
                label: "Account",
                children: (
                    <>
                        <ProFormText name="username" placeholder="Username" />
                        <ProFormText.Password name="password" placeholder="Password" />
                    </>
                ),
            },
            {
                key: "phone",
                label: "Phone",
                children: (
                    <>
                        <ProFormText name="phone" placeholder="Phone Number" />
                        <ProFormCaptcha name="code" phoneName="phone" placeholder="Code" onGetCaptcha={async () => { message.success("Sent!"); }} />
                    </>
                ),
            },
        ]} />
    </LoginForm>
);

export const loginFormData: AntdComponentData = {
    id: "pro-login-form",
    name: "LoginForm",
    description: "LoginForm provides a pre-styled login form component with support for logo, social login, captcha, and tab-based login methods.",
    whenToUse: "Use LoginForm for authentication pages. It provides consistent styling and supports common login patterns like password, phone, and social login.",
    docUrl: "https://procomponents.ant.design/en-US/components/login-form",
    demos: [
        {
            id: "basic",
            title: "Basic Login Form",
            description: "Standard username/password login",
            demo: <BasicLoginFormDemo />,
            code: `<LoginForm
  title="Login"
  subTitle="Welcome back"
  onFinish={async (values) => { ... }}
>
  <ProFormText name="username" placeholder="Username" />
  <ProFormText.Password name="password" placeholder="Password" />
</LoginForm>`,
        },
        {
            id: "logo",
            title: "With Logo",
            description: "Login with brand logo",
            demo: <LogoLoginFormDemo />,
            code: `<LoginForm
  logo={<Logo />}
  title="MyApp"
  subTitle="Sign in to continue"
>
  ...
</LoginForm>`,
        },
        {
            id: "social",
            title: "With Social Login",
            description: "Social login buttons below form",
            demo: <SocialLoginFormDemo />,
            code: `<LoginForm
  actions={
    <div>
      <Divider>Or continue with</Divider>
      <Space><GoogleBtn /><FacebookBtn /></Space>
    </div>
  }
>
  ...
</LoginForm>`,
        },
        {
            id: "captcha",
            title: "With Captcha",
            description: "Phone verification login",
            demo: <CaptchaLoginFormDemo />,
            code: `<LoginForm>
  <ProFormText name="phone" placeholder="Phone" />
  <ProFormCaptcha
    name="captcha"
    phoneName="phone"
    onGetCaptcha={async () => sendCode()}
  />
</LoginForm>`,
        },
        {
            id: "tabs",
            title: "With Tabs",
            description: "Multiple login methods",
            demo: <TabsLoginFormDemo />,
            code: `<LoginForm>
  <Tabs items={[
    { key: "account", label: "Account", children: <AccountFields /> },
    { key: "phone", label: "Phone", children: <PhoneFields /> },
  ]} />
</LoginForm>`,
        },
    ],
    apiProps: [
        { name: "title", type: "ReactNode", description: "Form title" },
        { name: "subTitle", type: "ReactNode", description: "Form subtitle" },
        { name: "logo", type: "ReactNode", description: "Logo element" },
        { name: "actions", type: "ReactNode", description: "Actions below form (social login)" },
        { name: "onFinish", type: "(values) => Promise<boolean>", description: "Submit callback" },
        { name: "message", type: "ReactNode", description: "Error message element" },
    ],
};
