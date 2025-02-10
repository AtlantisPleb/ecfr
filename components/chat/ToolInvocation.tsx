import { CheckCircle2, FileText, Loader2, Settings } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"

interface JSONValue {
  [key: string]: any;
}

export interface ToolInvocation {
  id?: string;
  toolCallId?: string;
  tool_name?: string;
  toolName?: string;
  input?: JSONValue;
  args?: JSONValue;
  output?: JSONValue;
  result?: JSONValue;
  status?: 'pending' | 'completed' | 'failed';
  state?: 'call' | 'result';
}

const ensureObject = (value: JSONValue): Record<string, any> => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, any>;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error("Failed to parse as JSON:", error);
    }
  }
  return {};
};

export function ToolInvocation({ toolInvocation }: { toolInvocation: ToolInvocation }) {
  console.log('========= TOOL INVOCATION START =========');
  console.log('Raw toolInvocation:', toolInvocation);

  const [isFileContentDialogOpen, setIsFileContentDialogOpen] = useState(false);
  const [isInputParamsDialogOpen, setIsInputParamsDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);

  if (!toolInvocation || typeof toolInvocation !== 'object') {
    console.error("Invalid toolInvocation prop:", toolInvocation);
    return <div>Error: Invalid tool invocation data</div>;
  }

  const {
    id,
    toolCallId,
    tool_name,
    toolName,
    input,
    args,
    output,
    result,
    status,
    state
  } = toolInvocation;

  console.log('Destructured values:', {
    id,
    toolCallId,
    tool_name,
    toolName,
    input,
    args,
    output,
    result,
    status,
    state
  });

  const displayId = id || toolCallId;
  const displayName = tool_name || toolName;
  const displayInput = input || args as JSONValue;
  const displayOutput = output || result;
  const displayStatus = status || (state === 'result' ? 'completed' : 'pending');

  console.log('Display values:', {
    displayId,
    displayName,
    displayInput,
    displayOutput,
    displayStatus
  });

  const inputObject = ensureObject(displayInput);
  console.log('Input object:', inputObject);

  const outputObject = displayOutput ? ensureObject(displayOutput) : null;
  console.log('Output object:', outputObject);

  const { owner, repo, branch } = inputObject;

  const repoInfo = owner && repo && branch
    ? `${owner}/${repo} (${branch})`
    : null;

  console.log('Repo info:', repoInfo);

  const renderStateIcon = () => {
    if (displayStatus === 'pending') {
      return <Loader2 className="animate-spin w-5 h-5 text-foreground" />;
    } else if (displayStatus === 'completed') {
      return <CheckCircle2 className="text-foreground w-6 h-6" />;
    } else if (displayStatus === 'failed') {
      return <span className="text-red-500">Failed</span>;
    }
    return null;
  };

  // Extract result fields from the output object
  const resultContent = result?.content || outputObject?.content;
  const resultSummary = result?.summary || outputObject?.summary;
  const resultDetails = result?.details || outputObject?.details;

  console.log('Result fields:', {
    resultContent,
    resultSummary,
    resultDetails,
    rawOutput: outputObject,
    rawResult: result
  });

  console.log('========= TOOL INVOCATION END =========');

  return (
    <Card className="text-xs mb-2">
      <CardHeader className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <CardTitle>{displayName}</CardTitle>
            {repoInfo && (
              <span className="text-xs text-zinc-500">
                {repoInfo}
              </span>
            )}
          </div>
          <div>{renderStateIcon()}</div>
        </div>
      </CardHeader>
      <CardContent>
        {resultSummary && <p className="mb-2">{resultSummary}</p>}
        <div className="flex space-x-2">
          <Dialog open={isInputParamsDialogOpen} onOpenChange={setIsInputParamsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                View Input Params
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Input Parameters</DialogTitle>
                <DialogDescription>
                  View the input parameters for this tool invocation
                </DialogDescription>
              </DialogHeader>
              <pre className="text-xs whitespace-pre-wrap break-all">
                {JSON.stringify(inputObject, null, 2)}
              </pre>
            </DialogContent>
          </Dialog>

          {(resultContent || resultDetails) && (
            <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  View Result
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Tool Result</DialogTitle>
                  <DialogDescription>
                    View the complete result from this tool invocation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {resultContent && (
                    <div>
                      <h4 className="font-medium mb-2">Content:</h4>
                      <pre className="text-xs whitespace-pre-wrap break-all bg-secondary p-4 rounded-md">
                        {resultContent}
                      </pre>
                    </div>
                  )}
                  {resultDetails && (
                    <div>
                      <h4 className="font-medium mb-2">Details:</h4>
                      <pre className="text-xs whitespace-pre-wrap break-all bg-secondary p-4 rounded-md">
                        {resultDetails}
                      </pre>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  )
}