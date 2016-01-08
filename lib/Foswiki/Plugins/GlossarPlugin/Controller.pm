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

use JSON;

use Foswiki::Func    ();
use Foswiki::Plugins ();

=pod
Acts as a controller for the JavaScript.
If no term is given in the request it will return a list of known definitions, otherwise it will return the definition of the term.
=cut

sub _getList {
    my ($glossar, $addQuery) = @_;
    $glossar =~ s#/#.#g;

    return (undef, '403', ($Foswiki::cfg{Extensions}{GlossarPlugin}{AccessAreaPermission}
      || 'Error: Unfortunately you do not have sufficient permissions to view glossary entries!'))
      unless Foswiki::Func::checkAccessPermission('VIEW', Foswiki::Func::getWikiName(), '', undef,
        $glossar, undef);

    my $kwdata =
      Foswiki::Func::expandCommonVariables(<<SEARCH, 'Glossar*Index', 'Glossar*');
%SEARCH{
type="query"
"form.name ~ '*Glossar*Form' AND Enabled = 'Enabled'$addQuery"
web="$glossar"
nonoise="on"
format="$glossar.\$topic\t\$formfield(keywords),\$formfield(hiddenkeywords)"
separator="\$n"
footer=""
header=""
}%
SEARCH

    my $re = {};
    for my $entry (split(/\n/, $kwdata)) {
        $entry =~
          s/^\s*(.+?)\s*$/$1/gs;  # trim on both sides, probably unnecessarily
        next if !$entry;
        my ($topic, $kws) = split(/\t/, $entry, 2);
        next unless defined $kws;
        my @kws = grep /\S/, split(/\s*,\s*/, $kws);
        $re->{$topic} = \@kws;
    }
    return $re;
}

sub _getTopic {
    my ($webtopic) = @_;

    my ($glossar, $topic) = Foswiki::Func::normalizeWebTopicName(undef, $webtopic);

    my $re;
    unless (
        Foswiki::Func::checkAccessPermission(
            'VIEW', Foswiki::Func::getWikiName(), '', $topic, $glossar, undef
        ))
    {
        $re = $Foswiki::cfg{Extensions}{GlossarPlugin}{AccessMsg}
          || 'Error: Unfortunately you do not have sufficient permissions to view this definition!';
        return (undef, '403', $re);
    }
    unless (Foswiki::Func::topicExists($glossar, $topic)) {
        $re = $Foswiki::cfg{Extensions}{GlossarPlugin}{NotFoundMsg}
          || 'Error: Definition not found!';
        return (undef, '404', $re);
    }

    # generate text for popup from found topic
    my ($meta, $text) = Foswiki::Func::readTopic($glossar, $topic);

    my $canCHange = $meta->expandMacros("%WORKFLOWEDITPERM{web=\"$glossar\" topic=\"$topic\"}%");

    # try to emulate automatic selection of viewtemplate for form
    my $tmpl;
    my $view = $meta->getFormName();
    if ( $view ) {
        $view =~ s#Form$#View#;
        if ( Foswiki::Func::topicExists($glossar, "${view}Template") ) {
            Foswiki::Func::loadTemplate($view, undef, $glossar);
            $tmpl = Foswiki::Func::expandTemplate('PopupContent');
        }
    }
    unless ( $tmpl ) {
        # fallback to standard template
        Foswiki::Func::loadTemplate('GlossaryPopup', undef, $glossar);
        $tmpl = Foswiki::Func::expandTemplate('PopupContent');
    }
    $tmpl =~ s#%TEXT%#$text#;
    Foswiki::Func::pushTopicContext($glossar, $topic);
    $re = Foswiki::Func::expandCommonVariables($tmpl, $topic, $glossar, $meta) || ' ';
    $re = Foswiki::Func::renderText($re, $glossar);
    Foswiki::Func::popTopicContext();
    if($Foswiki::cfg{Plugins}{SafeWikiPlugin}{Enabled}) {
        Foswiki::Plugins::SafeWikiPlugin::completePageHandler($re, 'Content-type: text/html');
    }
    Foswiki::Func::getContext()->{'OverrideSafeWikiPlugin'} = 1;

    my $cssclass = $meta->get( 'FIELD', 'GlossarClass' );
    $cssclass = ( $cssclass ) ? $cssclass->{value} : '';

    return {
        topic => "$glossar.$topic",
        text => $re,
        edit => $canChange,
        cssclass => $cssclass
    };
}

sub response {
    my ($session, $subject, $verb, $response) = @_;
    my $query = $session->{request};
    my $topic = $query->{param}->{thetopic}[0];  # topic to display in a popup
    my $glossar = $query->param('web')
      || $Foswiki::cfg{Extensions}{GlossarPlugin}{GlossarWeb}
      || 'Glossar';  # The web with the definitions
    my $addQuery =
      $Foswiki::cfg{Extensions}{GlossarPlugin}
      {AdditionalQuery};  # Additional Query
    $addQuery = " AND $addQuery" if $addQuery;
    my $windowtitle = '';

    my @re; # contents of response

    # check if topic is given, otherwise a list of terms is requested
    if (not defined $topic) {
        @re = _getList($glossar, $addQuery);
    } else {
        @re = _getTopic($topic);
    }
    my $status = defined($re[0]) ? 'ok' : $re[1];
    my $payload = defined($re[0]) ? $re[0] : [];
    my $errmsg = defined($re[0]) ? '' : $re[2];
    my $class = $re[3] || '';

    my $resp = "jQuery.callbackData="
      . JSON->new->encode({
            status   => $status,
            errorMsg => $errmsg,
            payload  => $payload,
      });
    $response->header(
        '-Cache-Control' => 'max-age=36000, private',
        '-Expires'       => '+12h',
    );
    return $resp;
}

1;
