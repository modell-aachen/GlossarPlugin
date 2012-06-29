# Plugin for Foswiki - The Free and Open Source Wiki, http://foswiki.org/
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version. For
# more details read LICENSE in the root of this distribution.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
#
# For licensing info read LICENSE file in the Foswiki root.

package Foswiki::Plugins::GlossarPlugin::Controller;

use strict;

use Foswiki::Func ();
use Foswiki::Plugins ();

=pod
Acts as a controller for the JavaScript.
If no term is given in the request it will return a list of known definitions, otherwise it will return the definition of the term.
=cut
sub response {
   my ( $session, $subject, $verb, $response ) = @_;
   my $query = $session->{request};
   my $term = $query->{param}->{term}[0]; # term user wants the definition of
   my $list = $query->{param}->{list}; # if user only wants a list of definitions
   my $user = $Foswiki::Plugins::SESSION->{user}; # user for AccessPermission
   $user = Foswiki::Func::getWikiName($user);
   my $glossar = $Foswiki::cfg{Extensions}{GlossarPlugin}{GlossarWeb} || 'Glossar'; # The web with the definitions
   my $addQuery = $Foswiki::cfg{Extensions}{GlossarPlugin}{AdditionalQuery}; # Additional Query
   $addQuery = " AND $addQuery" if $addQuery;
   my $windowtitle = '';

   my $re; # contents of response
   # check if term is given, otherwise a list of terms is requested
   if (not defined $term) {
     # return empty list if user has no access to glossar web
     if( not Foswiki::Func::checkAccessPermission('VIEW',$user,'', undef,$glossar,undef) ) {
       $re = '[]';
     } else {
       $re = Foswiki::Func::expandCommonVariables(<<SEARCH, 'GlossarIndex', 'Glossar');
%SEARCH{
  type="query"
  "form.name = 'GlossarForm' AND Enabled = 'Enabled'$addQuery"
  web="Glossar"
  nonoise="on"
  format="\$formfield(keywords)"
  separator=","
  footer=""
  header=""
}%
SEARCH
	# XXX Strange newlines and whitespaces
	$re =~ s#\s*,\s*#','#g;
	$re =~ s#\s*\n?$##g;
	$re = "'$re'";
	# XXX doublicated tags will cause errors in the javascript (beeing marked up twice)
	my @xxx = split(',',$re);
        my %xxxh=();
        @xxxh{@xxx}=1;
        delete $xxxh{''};
        $re = join(',', keys %xxxh);

        # escape . so the regex doesn't wildcard
	$re =~ s#\.#\\\\.#g;

	$re = "[$re]";
     }
   } else {
     # return definition of term

     # search for term in order to find out capitalization
     # @TODO: CaseSensitive
     my $topic = '';
#     my $lterm = lc($term);
#     foreach my $entry (@list) {
#       if (lc($entry) eq $lterm) {
#         $topic = "$entry";
#         last;
#       }
#     }
     my $caseSensitive = $Foswiki::cfg{Extensions}{GlossarPlugin}{Case} || 'off';
     my $keywords;
     if($caseSensitive eq 'off') {
       $term = lc($term);
       $keywords = 'lc(keywords)'
     } else {
       $keywords = 'keywords';
     }
     Foswiki::Func::writeWarning("casesensitive=\"$caseSensitive\" term=$term");
     $topic = Foswiki::Func::expandCommonVariables(<<SEARCH, 'GlossarIndex', 'Glossar');
%SEARCH{
  type="query"
  "form.name = 'GlossarForm' AND Enabled = 'Enabled' AND $keywords =~ '$term'$addQuery"
  web="Glossar"
  nonoise="on"
  format="\$topic"
  header=""
  footer=""
  separator=","
}%
SEARCH
     $topic =~ s#\n##g;
     
     # XXX tags occuring multiple times
     my @topics = split(',', $topic);

     if (scalar $list) {
	 return "\$.callbackData = { web : '$glossar', definitions : ['".join("','", @topics)."'] };";
     }

     if(not scalar @topics) {
       # no topic found
       # this can happen, if a definition has been removed since page was rendered
       $re = $Foswiki::cfg{Extensions}{GlossarPlugin}{NotFoundMsg} || 'Error: Definition not found!';
       if ($re =~ m/(.*)\s*:\s*(.*)/) {
         $windowtitle = $1;
	 $re = $2;
       }
     } else {
       my $topic = shift @topics;
       if( not Foswiki::Func::checkAccessPermission('VIEW',$user,'',$topic,$glossar,undef) ) {
         # user may not view definition
         $re = $Foswiki::cfg{Extensions}{GlossarPlugin}{AccessMsg} || 'Error: Unfortunately you do not have sufficient permissions to view this definition!';
         if ($re =~ m/(.*)\s*:\s*(.*)/) {
           $windowtitle = $1;
           $re = $2;
         }
       } else {
         # generate text for popup from found topic
         # I'm not sure wether this is the proper way to do this
         my ($meta, $text) = Foswiki::Func::readTopic( $glossar, $topic );
         $re = Foswiki::Func::expandCommonVariables($text, $topic, $glossar, $meta);
         $re = Foswiki::Func::renderText($re, $glossar);

         #XXX topic title
         $windowtitle = "<a href=\"".Foswiki::Func::getViewUrl($glossar, $topic)."\">$topic</a>";
         if(scalar @topics) {
             my $singleTopic = shift @topics;  
             $windowtitle .= " <em>(<a href=\"".Foswiki::Func::getViewUrl($glossar, $singleTopic)."\">$singleTopic</a>";
             foreach $singleTopic (@topics) {
                 $windowtitle .= ", <a href=\"".Foswiki::Func::getViewUrl($glossar, $singleTopic)."\">$singleTopic</a>";
             }
  	   $windowtitle .= ")</em>";
         }
       }
     }


     # prepare message to be returned as payload
     # excape some characters so they can be transmitted
     $re =~ s#\\#\\\\#g;
     $re =~ s#\"#\\\"#g;
     $re =~ s#\'#\\\'#g;
     $re =~ s#\n#\<br\>#g;
     $re = "'$re'";
   }

   my $resp = <<RESP;
\$.callbackData = {
    status : 'ok',
    errorMsg : '',
    title: '$windowtitle',
    payload : $re
};
RESP

  $response->header(
    -'Cache-Control' => 'max-age=36000, public',
    -'Expires' => '+12h',
  );

   return $resp;
}

1;
