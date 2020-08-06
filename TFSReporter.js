var request = require('request');
var Conf=require('./config.json')

const TFS_URL=Conf.TFS_URL;
const TFS_TOKEN=Conf.TFS_TOKEN;


module.exports = class TFSReporter
{

    TFS_RUN_ID=0;
    TFS_TESTSUITE=0;
    TFS_TESTPLAN=0;

    Status = {
        Passed: 'Passed',
        Failed: 'Failed',
        Blocked: 'Blocked',
        Aborted:'Aborted',
        Timeout:'Timeout',
        None:'None',
        NotExecuted:'NotExecuted',
        Warning:'Warning',
        Error:'Error',
        NotApplicable:'NotApplicable',
        Paused:'Paused',
        InProgress:'InProgress'
        
    }

    
     constructor(RunName,TestPlanID,TestSuiteID)
    {

        return (async () => {
            this.TFS_TESTPLAN=TestPlanID;
            this.TFS_TESTSUITE=TestSuiteID;
            this.TFS_RUN_ID=  await this.CreateTFSRun(RunName);
            return this; 
        })();


        
       
        
    }

    async ReportTestCase(TestCaseID,Status)
    {
        await this.UpdateResultForTestCase(this.TFS_RUN_ID,TestCaseID,Status);
    }
    
  
    async  CreateTFSRun(RunName)
{
    var RunID;
    var jsonObject ;
    var TodayDate=new Date().toLocaleString().replace( /\//g,"_").replace(/:/g,"_").replace(', ','_');

    var TestPoints=await this.GetTestPointIDsFromTestSuite();
    var TestCases=await this.GetTestCaseIDsFromTestSuite();

    var JSONBody = '{"automated":"True",'+
                   '"Name":"'+RunName+'" ,' +
                   '"plan":{"id":' + this.TFS_TESTPLAN + '},' +
                   '"pointIds":['+TestPoints+'],' +
                   '"comment":"Create By Automation:'+TodayDate +'",' +
                   '"state":"InProgress"}';
    try{
        jsonObject = await this.RestCall(TFS_URL+ '/_apis/test/runs?api-version=1.0','POST',JSONBody);
        RunID = JSON.parse(jsonObject).id;
        console.log('New Run was created with ID:' + RunID + ' under TestPlan ID:' + this.TFS_TESTPLAN + ' Containing TestCases [' +TestCases +']' );
        return RunID;
    }catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
      
}
async  CloseTFSRun()
{
   
    var JSONBody = '{"state":"Completed"}';
    try{
         await this.RestCall(TFS_URL+ '/_apis/test/runs/'+this.TFS_RUN_ID+'?api-version=1.0','PATCH',JSONBody);
         console.log('Marked RunID: ' +this.TFS_RUN_ID+ ' As Completed!');
    }catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
      
}
async  DeleteTFSRun(RunID)
{
 
    try{
        jsonObject = await this.RestCall(TFS_URL+ '/_apis/test/runs/'+RunID +'?api-version=1.0','DELETE',);
        console.log('RunID:' + RunID + ' under TestPlan ID:' + this.TFS_TESTPLAN + ' Was Deleted' );
    }catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
      
}


async  GetTestPointIDsFromTestSuite()
{
    var TestPointIDs=[];
    var jsonObject ;
    try{
        jsonObject = await this.RestCall(TFS_URL+ '/_apis/test/Plans/'+ this.TFS_TESTPLAN+'/Suites/'+this.TFS_TESTSUITE+'/points?api-version=2.0-preview','GET',);
        var TestCaseArr = JSON.parse(jsonObject).value;
        for (const val of TestCaseArr) {
            TestPointIDs.push(val.id);
            //console.log(val.id);
        }
        return TestPointIDs;
    }catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
      
}

async  GetTestCaseIDsFromTestSuite()
{
    var TestCaseIDs=[];
    var jsonObject ;
    try{
        jsonObject = await this.RestCall(TFS_URL+ '/_apis/test/Plans/'+ this.TFS_TESTPLAN+'/Suites/'+this.TFS_TESTSUITE+'/testcases?api-version=1.0','GET',);
        var TestCaseArr = JSON.parse(jsonObject).value;
        for (const val of TestCaseArr) {
            TestCaseIDs.push(val.testCase.id);
            //console.log(val.id);
        }
        return TestCaseIDs;
    }catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
      
}

async  UpdateResultForTestCase(RunID,TestCaseID,Status)
{
    var jsonObject ;
    var TestRunID=await this.GetTestRunIDFromResult(RunID,TestCaseID);
    var TodayDate=new Date().toLocaleString().replace( /\//g,"_").replace(/:/g,"_").replace(', ','_');

    var JSONBody = '[' +
    '{ "testResult":{"id":"' +TestRunID +'"},'+
     '"state":"Completed" ,' +
     '"outcome":"' + Status + '",' +
     '"comment":"Reported Automatically-'+TodayDate+ '"}]';
     
//console.log(JSONBody);
    try{
        jsonObject = await this.RestCall(TFS_URL+ '/_apis/test/runs/'+RunID+'/results?api-version=2.0-preview','PATCH',JSONBody);
        var UpdateCount = JSON.parse(jsonObject).count;
        if(UpdateCount>0)
        console.log('TestCase with ID:' + TestCaseID + ' Was updated to: ' + Status );
        else
        console.log('TestCase with ID:' + TestCaseID + ' Was not updated');
    }catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
      
}


async  GetTestRunIDFromResult(RunID,TestCaseID)
{
    var TestRunID;
    var jsonObject ;
    try{
        jsonObject = await this.RestCall(TFS_URL+ '/_apis/test/runs/'+RunID+'/results?api-version=2.0-preview','GET',);
        var TestCaseArr = JSON.parse(jsonObject).value;
        for (const val of TestCaseArr) {
            if(val.testCase.id==TestCaseID)
            {
                TestRunID=val.id;
            }
          //  console.log(val.testCase.id);
        }
        return TestRunID;
    }catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
      
}




    RestCall(RestURL,ReqType,ReqBody)
    {
        var jsonObject ;
    
    
        var options = {
          'method': ReqType,
          'url': RestURL,
          'headers': {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' +TFS_TOKEN 
        },
        body: ReqBody
    
        };
        
        return new Promise((resolve, reject) => {
        request(options, function (error, response) { 
          if (error) reject(error);
          if (response.statusCode != 200) {
            reject('Invalid status code <' + response.statusCode + '>');
            }
           // console.log('Request: ' + RestURL);
           // console.log('Response: ' + response.body);
    
          resolve(response.body);
        });
     });
    }

}

