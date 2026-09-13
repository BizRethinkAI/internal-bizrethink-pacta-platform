import { createConnection, isIP, type Socket } from 'node:net';
import { checkServerIdentity } from 'node:tls';
import { AppError } from '@documenso/lib/errors/app-error';
import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import { withOutboundDeadline } from './outbound/deadline';
import { resolveOutboundDestination } from './outbound/destination';

// Phase B (overlay 010 prerequisite): test SMTP credentials without saving.
//
// Used by the "Test connection" button on /o/<org>/settings/smtp. Builds a
// throwaway nodemailer transporter from the form values, calls
// `transporter.verify()` (which opens an SMTP connection, performs auth, and
// closes — does NOT send a message), and returns either ok or a bounded error.
// Shwet's A-14 decision: public Internet destinations only, with verified TLS.
//
// Decoupled from the persisted BizrethinkOrganisationSmtpConfig flow so the
// admin can verify creds BEFORE writing them to the DB.

export type TestSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string; // plaintext — never persisted from this path
};

export type TestSmtpResult = { ok: true } | { ok: false; error: string };

export const testOrgSmtp = async (config: TestSmtpConfig): Promise<TestSmtpResult> => {
  let transporter: Transporter | undefined;
  let socket: Socket | undefined;
  try {
    return await withOutboundDeadline(async (signal) => {
      // No webhook exception list here: its operator permission does not grant
      // an organisation manager access to private SMTP destinations.
      const destination = await resolveOutboundDestination(config.host);
      signal.throwIfAborted();
      // forceAuth is supported by the installed Nodemailer transport but omitted
      // from its DefinitelyTyped options. A verification must actually log in.
      const options: SMTPTransport.Options & { forceAuth: boolean } = {
        host: destination.address,
        port: config.port,
        secure: config.secure,
        requireTLS: true,
        forceAuth: true,
        tls: {
          servername: isIP(destination.hostname) ? undefined : destination.hostname,
          rejectUnauthorized: true,
          checkServerIdentity: (_hostname, certificate) => checkServerIdentity(destination.hostname, certificate),
        },
        auth: { user: config.username, pass: config.password },
        logger: false,
        debug: false,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
        // Own the TCP socket so the total deadline can really destroy it.
        // Nodemailer's non-pooled transporter.close() alone does not close an
        // in-progress verify() connection. Nodemailer upgrades this connected
        // socket for implicit TLS / STARTTLS with the original certificate name.
        getSocket(_options, callback) {
          if (signal.aborted) {
            callback(signal.reason, undefined);
            return;
          }
          socket = createConnection({ host: destination.address, port: config.port, family: destination.family });
          let delivered = false;
          const finish = (error: Error | null) => {
            if (delivered) {
              return;
            }
            delivered = true;
            callback(error, error ? undefined : { connection: socket });
          };
          socket.once('error', finish);
          socket.once('connect', () => finish(null));
        },
      };
      transporter = createTransport(options);
      await transporter.verify();
      return { ok: true };
    });
  } catch (error) {
    return {
      ok: false,
      // Remote SMTP banners and library errors may contain credentials or
      // internal connection details. Never return those strings to the caller.
      error:
        error instanceof AppError
          ? error.message
          : 'SMTP connection test failed. Check the server, TLS and credentials.',
    };
  } finally {
    socket?.destroy();
    transporter?.close();
  }
};
