import * as React from 'react';
import {
  Html,
  Body,
  Container,
  Text,
  Heading,
  Preview,
} from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => {
  return (
    <Html>
      <Preview>Welcome to Condo Manager</Preview>
      <Body
        style={{
          backgroundColor: '#f6f9fc',
          padding: '20px',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
          }}
        >
          <Heading>Welcome, {name}</Heading>
          <Text>Your account has been successfully created.</Text>
          <Text>You can now log in and manage your condo dashboard.</Text>
          <Text>Condo Manager Team</Text>
        </Container>
      </Body>
    </Html>
  );
};