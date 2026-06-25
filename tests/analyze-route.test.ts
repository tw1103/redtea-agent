import { afterEach,describe,expect,it,vi } from "vitest";
import { AnalysisResultSchema } from "@/lib/schemas";
vi.mock("@/lib/openai",()=>({AnalysisParseError:class extends Error{},AnalysisServiceError:class extends Error{},analyzeWithOpenAI:vi.fn().mockRejectedValue(new Error("upstream"))}));
import { POST } from "@/app/api/analyze/route";
const valid={analysisMode:"quick",scenarioName:"财务对账",scenarioDescription:"核对银行流水与 ERP 账簿"};
const req=(body:unknown)=>new Request("http://localhost/api/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
afterEach(()=>{delete process.env.USE_MOCK_ANALYSIS;delete process.env.OPENAI_API_KEY});
describe("分析接口",()=>{it("非法输入返回 400",async()=>expect((await POST(req({...valid,scenarioName:""}))).status).toBe(400));it("Mock 模式返回 200 且 Schema 合法",async()=>{process.env.USE_MOCK_ANALYSIS="true";const res=await POST(req(valid));const body=await res.json();expect(res.status).toBe(200);expect(body.mode).toBe("mock");expect(AnalysisResultSchema.safeParse(body.result).success).toBe(true)});it("OpenAI 异常返回统一错误结构",async()=>{process.env.USE_MOCK_ANALYSIS="false";process.env.OPENAI_API_KEY="test-key";const res=await POST(req(valid));expect(res.status).toBe(500);expect(await res.json()).toEqual({success:false,error:{code:"ANALYSIS_FAILED",message:"分析服务暂时不可用，请稍后重试"}})})});
