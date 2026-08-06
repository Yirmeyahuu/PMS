import React from 'react';
import { DocCallout } from '../DocCallout';
import { ScreenshotPlaceholder } from '../ScreenshotPlaceholder';

const Chapter37: React.FC = () => {
  return (
    <>
      <p className="text-xl text-gray-500 font-body mb-8">
        Learn how to obtain assistance, report software bugs, and suggest new features when you encounter issues that cannot be resolved using this manual.
      </p>

      {/* SECTION 37.1 — Overview */}
      <h3 className="text-2xl font-semibold text-trust-harbor font-heading mt-12 mb-4 border-b border-gray-100 pb-2">
        37.1 Overview
      </h3>
      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 p-4 md:p-8">
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            While this User Manual and the Troubleshooting Guide are designed to solve the vast majority of operational questions, some situations inevitably require direct assistance from the Malasakit Support Team. 
          </p>
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            This final chapter outlines how to effectively communicate with technical support to ensure your issues are resolved as quickly as possible.
          </p>
          
          <DocCallout type="info" title="Before Contacting Support">
            To help our team resolve your issue efficiently, we recommend you:
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Review the relevant User Manual chapter.</li>
              <li>Complete the universal Troubleshooting steps (Chapter 36).</li>
              <li>Gather full-screen screenshots of the issue.</li>
              <li>Record the exact text of any error messages.</li>
              <li>Note the exact time the issue occurred.</li>
            </ul>
          </DocCallout>
        </div>
      </div>


      {/* SECTION 37.2 — Technical Support */}
      <h3 className="text-2xl font-semibold text-trust-harbor font-heading mt-16 mb-4 border-b border-gray-100 pb-2">
        37.2 Technical Support
      </h3>
      <p className="text-gray-700 font-body mb-6">Requesting help for system failures.</p>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 p-4 md:p-8">
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            Technical support focuses specifically on resolving software-related failures and system errors rather than providing training on clinic workflows. You should contact Technical Support when experiencing:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 font-body mb-6">
            <li>Total inability to access the system (outages).</li>
            <li>Persistent login issues despite password resets.</li>
            <li>Data synchronization problems across branches.</li>
            <li>Server errors ("Error 500" or continuous loading spinners).</li>
            <li>Severe performance degradation (extreme slowness).</li>
          </ul>

          <h4 className="text-lg font-bold text-gray-900 mt-8 mb-2">Information to Include</h4>
          <p className="text-gray-700 mb-4">When opening a technical support ticket, always include the following payload to speed up diagnostics:</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700 text-sm">
              <li>• Clinic Name & Branch</li>
              <li>• Your User Role</li>
              <li>• Device (e.g., Mac, Windows Desktop)</li>
              <li>• Web Browser (e.g., Chrome, Safari)</li>
              <li>• Date and exact Time of failure</li>
              <li>• Clear description of the issue</li>
              <li>• Steps you took before the failure</li>
              <li>• Full-screen screenshots</li>
            </ul>
          </div>

          <ScreenshotPlaceholder label="Screenshot 37.1: Support Contact Section. Highlight: Contact Support page or section, Email address, Support information, Contact button." />
        </div>
      </div>


      {/* SECTION 37.3 — Bug Reports */}
      <h3 className="text-2xl font-semibold text-trust-harbor font-heading mt-16 mb-4 border-b border-gray-100 pb-2">
        37.3 Bug Reports
      </h3>
      <p className="text-gray-700 font-body mb-6">Reporting software defects.</p>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 p-4 md:p-8">
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            A "bug" is an error, flaw, or fault in the software that causes it to produce an incorrect or unexpected result. Examples of bugs include buttons that don't respond when clicked, incorrect invoice calculations, or visual layouts that appear broken.
          </p>
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            When submitting a bug report, please use the following structured format to help developers recreate the issue on their end:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 font-body mb-6">
            <li><strong>What happened?</strong> (e.g., "The save button remained disabled after filling out the form.")</li>
            <li><strong>What was expected?</strong> (e.g., "The save button should turn blue and allow submission.")</li>
            <li><strong>Steps performed:</strong> (e.g., "1. Opened Patient Profile. 2. Edited Phone Number. 3. Clicked away.")</li>
            <li><strong>Screenshot attached.</strong></li>
            <li><strong>Error message attached.</strong> (If any)</li>
          </ol>

          <ScreenshotPlaceholder label="Screenshot 37.2: Example Bug Scenario. Highlight: Error message, Screen where the issue occurred, Highlighted affected feature." />
          
          <DocCallout type="important">
            Detailed bug reports significantly reduce developer investigation time. A bug that takes a developer 5 minutes to reproduce can be fixed almost immediately; a vague report can take weeks to resolve.
          </DocCallout>
        </div>
      </div>


      {/* SECTION 37.4 — Feature Requests */}
      <h3 className="text-2xl font-semibold text-trust-harbor font-heading mt-16 mb-4 border-b border-gray-100 pb-2">
        37.4 Feature Requests
      </h3>
      <p className="text-gray-700 font-body mb-6">Suggesting system improvements.</p>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 p-4 md:p-8">
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            We continuously build Malasakit around the real-world needs of healthcare providers. Users are actively encouraged to submit ideas for improving the platform, such as new statistical reports, UI enhancements, or ideas for workflow automation.
          </p>
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            When submitting a feature request, please explain:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 font-body mb-6">
            <li>The <strong>Current Limitation</strong> (e.g., "Currently we have to manually copy...").</li>
            <li>The <strong>Desired Improvement</strong> (e.g., "We need a button that auto-fills...").</li>
            <li>The <strong>Business Value</strong> (e.g., "This would save our front desk 2 hours a day.").</li>
          </ul>

          <ScreenshotPlaceholder label="Screenshot 37.3: Feature Request Example. Highlight: Feature suggestion form, Feedback area, Enhancement description." />
          
          <DocCallout type="tip">
            Always describe your real clinic workflows instead of only requesting a specific button or feature. Understanding the <em>reason</em> behind the request helps the product team design a much better holistic solution.
          </DocCallout>
        </div>
      </div>


      {/* SECTION 37.5 — Support Channels */}
      <h3 className="text-2xl font-semibold text-trust-harbor font-heading mt-16 mb-4 border-b border-gray-100 pb-2">
        37.5 Support Channels
      </h3>
      <p className="text-gray-700 font-body mb-6">Choosing the right method of communication.</p>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 p-4 md:p-8">
          <div className="overflow-x-auto mb-6 border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm font-body">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Support Channel</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Best Used For</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-700"><strong>Email Support</strong></td>
                  <td className="px-4 py-2.5 text-gray-600">General technical support inquiries and account recovery.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-700"><strong>Help Desk Portal</strong></td>
                  <td className="px-4 py-2.5 text-gray-600">Submitting bug reports, tracking issue progress, and escalating urgent server outages.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-700"><strong>Website Contact Form</strong></td>
                  <td className="px-4 py-2.5 text-gray-600">General inquiries, billing questions, or subscription upgrade requests.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-700"><strong>Feature Request Board</strong></td>
                  <td className="px-4 py-2.5 text-gray-600">Submitting and voting on product suggestions and workflow improvements.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <ScreenshotPlaceholder label="Screenshot 37.4: Support Channels. Highlight: Support contact options, Email, Website, Contact methods." />
        </div>
      </div>


      {/* SECTION 37.6 — Response Expectations */}
      <h3 className="text-2xl font-semibold text-trust-harbor font-heading mt-16 mb-4 border-b border-gray-100 pb-2">
        37.6 Response Expectations
      </h3>
      <p className="text-gray-700 font-body mb-6">What happens after you submit a ticket.</p>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 p-4 md:p-8">
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            After submitting a support request, you can expect the following workflow:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 font-body mb-6">
            <li><strong>Submission:</strong> You submit the request via the Help Desk or Email.</li>
            <li><strong>Confirmation:</strong> You receive an automated email containing your unique Ticket Number.</li>
            <li><strong>Review:</strong> The support team triages the issue based on urgency (e.g., server outages are prioritized over minor visual bugs).</li>
            <li><strong>Investigation:</strong> Support may reply requesting additional screenshots or steps to reproduce the issue.</li>
            <li><strong>Resolution:</strong> A technical fix is deployed, or a temporary workaround is provided.</li>
            <li><strong>Closure:</strong> The ticket is marked as resolved and closed.</li>
          </ol>
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            Response times vary depending on the complexity of the issue and your clinic's specific Service Level Agreement (SLA).
          </p>

          <ScreenshotPlaceholder label="Screenshot 37.5: Support Request Confirmation. Highlight: Confirmation message, Ticket number (if applicable), Successful submission notification." />
        </div>
      </div>


      {/* SECTION 37.7 — Best Practices */}
      <h3 className="text-2xl font-semibold text-trust-harbor font-heading mt-16 mb-4 border-b border-gray-100 pb-2">
        37.7 Best Practices
      </h3>
      
      <DocCallout type="tip" title="Support Tips">
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>One Issue Per Ticket:</strong> Submit separate requests for unrelated problems. This allows different technical teams to solve them simultaneously.</li>
          <li><strong>Screenshots are Mandatory:</strong> Always include full-screen screenshots; they provide critical context that text descriptions cannot.</li>
          <li><strong>Avoid Duplicates:</strong> Do not submit the same issue through email, the contact form, and the help desk; this slows down the resolution process.</li>
          <li><strong>Update Support:</strong> If you accidentally resolve the issue yourself, kindly reply to the ticket so support can close it and assist other clinics.</li>
        </ul>
      </DocCallout>


      {/* SECTION 37.8 — Thank You */}
      <h3 className="text-2xl font-semibold text-trust-harbor font-heading mt-16 mb-4 border-b border-gray-100 pb-2">
        37.8 Thank You
      </h3>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 p-4 md:p-8">
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            Thank you for choosing Malasakit as your Practice Management System. Our goal is to streamline your clinic's operations so you can focus entirely on delivering exceptional patient care.
          </p>
          <p className="text-gray-700 font-body leading-relaxed mb-6">
            This platform is continuously improved through direct user feedback, feature requests, and daily collaboration with healthcare professionals like yourself. We encourage you to continue exploring new features as future versions of Malasakit are deployed.
          </p>

          <DocCallout type="info" title="End of User Manual">
            <p className="font-bold text-lg mb-2">Congratulations!</p>
            <p>You have successfully completed the Malasakit User Manual. Please continue referring to this documentation whenever you need guidance on configuring your clinic, scheduling patients, or processing financial records efficiently.</p>
          </DocCallout>

          {/* Quick link to return to top/overview */}
          <div className="mt-12 flex justify-center">
            <a 
              href="#chapter-1" 
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-trust-harbor hover:bg-trust-harbor-dark transition-colors duration-200"
            >
              Return to Table of Contents
            </a>
          </div>
        </div>
      </div>

    </>
  );
};

export default Chapter37;
