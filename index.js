var _ = require("lodash-contrib");
/*jshint -W079 */
var Promise = require("bluebird");

/*

resolve(invokes, known);
goal, shrink the invokeables, grow the knowns
when invokes are empty, job is done, return knowns.

groupby functions with known arguments,
invoke all of those functions,
when done, merge with knowns,
resolve again with knew knowns, and less invokables.

*/

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG_SPLIT = /,/;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;


function miniAnnotate(fn){
  var fnText = fn.toString().replace(STRIP_COMMENTS, '');
  //   console.log("fnText",fnText);
  var argDecl = fnText.match(FN_ARGS);
  //   console.log("argDecl",argDecl);
  var fnArgs = argDecl[1].split(FN_ARG_SPLIT);
  //   console.log("fnArgs",fnArgs);
  return _.map(fnArgs, function(arg){
    return arg.trim();
  });
}

function resolve(invokables, knowns){

  function convertToExpandedNotation(invokables){
    return _.chain(invokables)
    .map(function(fn, name){
      return [name, fn, miniAnnotate(fn)];
    })
    .value();
  }

  function checkForUnresolvables(newKnowns, oldKnowns){
    var newNames = _.keys(newKnowns);
    var oldNames = _.keys(oldKnowns);

    if(_.isEmpty(_.difference(newNames, oldNames))){
      return true;
    }
    return false;
  }

  function pendingResolutions(invokables, knowns){
    var invokablesAnnotations = _.chain(invokables)
    .map(_.property(2))
    .flatten()
    .value();

    console.log("invokablesAnnotations", invokablesAnnotations, invokables);

    var knownNames = _.keys(knowns);

    console.log("knownNames", knownNames);

    var unknownResolutions = _.difference(invokablesAnnotations, knownNames);

    return unknownResolutions;

  }

  function resolveFlatInvokables(invokables, knowns){
    if(_.isEmpty(invokables)){
      return new Promise(function(resolve){
        resolve(knowns);
      });
    }
    else{
      var groupedInvokables = _.groupBy(invokables,function(pair){
        return _.every(pair[2], _.partial(_.has, knowns));
      });

      console.log("groupedInvokables", JSON.stringify(groupedInvokables));

      var invokeNow = groupedInvokables.true;
      var invokeLater = groupedInvokables.false;

      var invokeNowsWithResolvedArgs = _.map(invokeNow, function(invokableGroup){
        var annotedArgs = invokableGroup[2];
        var resolvedArgs = _.map(annotedArgs, function(name){
          return knowns[name];
        });

        return invokableGroup.concat([resolvedArgs]);
      });

      console.log("invokeNowsWithResolvedArgs", invokeNowsWithResolvedArgs);

      var applyResolvedArgs = _.map(invokeNowsWithResolvedArgs, function(invokableGroup){
        var fn = invokableGroup[1];
        var args = invokableGroup[3];
        var resoluion = fn.apply(null, args);
        return resoluion;
      });


      return Promise.all(applyResolvedArgs)
      .then(function(resolutions){
        console.log("resolutions", resolutions);
        var newKnowns = _.chain(invokeNowsWithResolvedArgs)
        .zip(resolutions)
        .map(_.juxt(_.compose(_.first,_.first),_.last))
        .object()
        .value();
        console.log("new knowns", newKnowns);

        console.log("knowns", knowns);
        console.log("newKnowns", newKnowns);

        var combinedKnowns = _.merge(knowns, newKnowns);

        console.log("combinedKnowns", combinedKnowns);

        if(checkForUnresolvables(newKnowns, knowns)){
          var unresolveables = pendingResolutions(invokeLater, combinedKnowns);
          throw new Error("can not resolve all dependencies: " + unresolveables);
        }

        return resolveFlatInvokables(invokeLater, combinedKnowns);
      });

    }
  }

  var flatInvokables = convertToExpandedNotation(invokables);

  return resolveFlatInvokables(flatInvokables, knowns);
}

module.exports = resolve;
